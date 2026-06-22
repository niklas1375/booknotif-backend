import { getDatabase } from '../database/db';
import { onleiheService } from './onleiheService';

export class OnleiheCheckService {
  /**
   * Check Onleihe availability for books across all user-subscribed libraries
   * This is the main function that will be called by the cron job
   * 
   * Optimization strategy:
   * - Check each book/library combination only once per run
   * - Reuse availability results across all users
   * - Only stop checking a book once ALL users have been notified via their accessible libraries
   */
  async checkOnleiheAvailability(): Promise<void> {
    console.log('Starting Onleihe availability check...');

    try {
      const db = getDatabase();

      // Get all books that have at least one user subscription
      const booksToCheck = await db
        .selectFrom('books')
        .innerJoin('user_book_subscriptions', 'books.id', 'user_book_subscriptions.book_id')
        .innerJoin('authors', 'books.author_id', 'authors.id')
        .select([
          'books.id',
          'books.title',
          'authors.name as author_name',
        ])
        .distinct()
        .execute();

      console.log(`Found ${booksToCheck.length} books with subscriptions to check`);

      // Get all active libraries
      const libraries = await db
        .selectFrom('onleihe_libraries')
        .selectAll()
        .execute();

      console.log(`Checking across ${libraries.length} Onleihe libraries`);

      // Process each book
      for (const book of booksToCheck) {
        await this.checkBookAcrossLibraries(
          book.id,
          book.title,
          book.author_name,
          libraries
        );
      }

      console.log('Onleihe availability check completed');
    } catch (error) {
      console.error('Error during Onleihe availability check:', error);
    }
  }

  /**
   * Check a book across libraries, optimizing by:
   * 1. Checking each book/library combination only once
   * 2. Stopping when all users have been notified via their accessible libraries
   * 
   * @param bookId The database ID of the book
   * @param title The title of the book
   * @param authorName The name of the author
   * @param libraries Array of all libraries to check
   */
  private async checkBookAcrossLibraries(
    bookId: number,
    title: string,
    authorName: string,
    libraries: Array<{ id: number; name: string; onleihe_id: string; description: string | null; created_at: Date }>
  ): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Get all users subscribed to this book and their library subscriptions
    const userLibraries = await db
      .selectFrom('user_book_subscriptions')
      .innerJoin('user_onleihe_libraries', 'user_book_subscriptions.user_id', 'user_onleihe_libraries.user_id')
      .select([
        'user_book_subscriptions.user_id',
        'user_onleihe_libraries.library_id',
      ])
      .where('user_book_subscriptions.book_id', '=', bookId)
      .execute();

    if (userLibraries.length === 0) {
      console.log(`No users with library subscriptions for book "${title}"`);
      return;
    }

    // Get unique users subscribed to this book
    const uniqueUsers = [...new Set(userLibraries.map(ul => ul.user_id))];
    console.log(`Checking "${title}" by ${authorName} for ${uniqueUsers.length} user(s)...`);

    // Track which users have been notified
    const notifiedUsers = new Set<number>();

    // Check if users already have notifications for this book
    const existingNotifications = await db
      .selectFrom('notifications')
      .select(['user_id'])
      .where('book_id', '=', bookId)
      .where('notification_type', '=', 'onleihe_available')
      .execute();

    existingNotifications.forEach(n => notifiedUsers.add(n.user_id));

    // If all users already notified, skip this book entirely
    if (notifiedUsers.size === uniqueUsers.length) {
      console.log(`  → All users already notified, skipping book`);
      return;
    }

    // Get libraries that users have access to
    const relevantLibraryIds = new Set(userLibraries.map(ul => ul.library_id));
    const relevantLibraries = libraries.filter(lib => relevantLibraryIds.has(lib.id));

    console.log(`  → Checking ${relevantLibraries.length} relevant libraries`);

    // Check each relevant library
    for (const library of relevantLibraries) {
      try {
        // Check if we already have a record for this book/library combination
        const existingRecord = await db
          .selectFrom('book_onleihe_availability')
          .select(['id', 'is_available'])
          .where('book_id', '=', bookId)
          .where('library_id', '=', library.id)
          .executeTakeFirst();

        let isAvailable: boolean;

        // If already found available, reuse that information (no API call)
        if (existingRecord && existingRecord.is_available === 1) {
          console.log(`  ✓ Already available in ${library.onleihe_id} (reusing data)`);
          isAvailable = true;
        } else {
          // Make API call to check availability
          console.log(`  → Checking ${library.onleihe_id}...`);
          isAvailable = await onleiheService.isBookAvailable(
            library.onleihe_id,
            title,
            authorName
          );

          // Update or create availability record
          if (existingRecord) {
            await db
              .updateTable('book_onleihe_availability')
              .set({
                is_available: isAvailable ? 1 : 0,
                checked_at: now,
              })
              .where('id', '=', existingRecord.id)
              .execute();
          } else {
            await db
              .insertInto('book_onleihe_availability')
              .values({
                book_id: bookId,
                library_id: library.id,
                is_available: isAvailable ? 1 : 0,
                checked_at: now,
              })
              .execute();
          }

          if (isAvailable) {
            console.log(`  ✓ Available in ${library.onleihe_id}`);
          } else {
            console.log(`  ✗ Not available in ${library.onleihe_id}`);
          }
        }

        // If available, notify users who have access to this library and haven't been notified yet
        if (isAvailable) {
          const usersWithAccessToThisLibrary = userLibraries
            .filter(ul => ul.library_id === library.id)
            .map(ul => ul.user_id)
            .filter(userId => !notifiedUsers.has(userId));

          if (usersWithAccessToThisLibrary.length > 0) {
            await this.createOnleiheNotifications(bookId, library.id, usersWithAccessToThisLibrary);
            
            // Mark these users as notified
            usersWithAccessToThisLibrary.forEach(userId => notifiedUsers.add(userId));
            
            console.log(`  → Notified ${usersWithAccessToThisLibrary.length} user(s) via ${library.onleihe_id}`);
          }
        }

        // If all users have been notified, we can stop checking other libraries
        if (notifiedUsers.size === uniqueUsers.length) {
          console.log(`  → All users notified, skipping remaining libraries`);
          break;
        }
      } catch (error) {
        console.error(`  ✗ Error checking library ${library.onleihe_id}:`, error);
        // Continue checking other libraries even if one fails
      }
    }

    const remainingUsers = uniqueUsers.length - notifiedUsers.size;
    if (remainingUsers > 0) {
      console.log(`  → ${remainingUsers} user(s) still waiting for availability in their libraries`);
    }
  }

  /**
   * Create Onleihe availability notifications for specific users
   * @param bookId The database ID of the book
   * @param libraryId The database ID of the library
   * @param userIds Array of user IDs to notify
   */
  private async createOnleiheNotifications(
    bookId: number,
    libraryId: number,
    userIds: number[]
  ): Promise<void> {
    try {
      const db = getDatabase();

      // Get the book details
      const book = await db
        .selectFrom('books')
        .select(['author_id'])
        .where('id', '=', bookId)
        .executeTakeFirst();

      if (!book || !book.author_id) {
        console.log(`Book ${bookId} not found or has no author`);
        return;
      }

      // Create notifications for each user
      for (const userId of userIds) {
        // Double-check notification doesn't already exist
        const existingNotification = await db
          .selectFrom('notifications')
          .select(['id'])
          .where('user_id', '=', userId)
          .where('book_id', '=', bookId)
          .where('notification_type', '=', 'onleihe_available')
          .executeTakeFirst();

        if (!existingNotification) {
          await db
            .insertInto('notifications')
            .values({
              user_id: userId,
              author_id: book.author_id,
              book_id: bookId,
              notification_type: 'onleihe_available',
              status: 'pending',
            })
            .execute();
        }
      }
    } catch (error) {
      console.error('Error creating Onleihe notifications:', error);
    }
  }
}

export const onleiheCheckService = new OnleiheCheckService();