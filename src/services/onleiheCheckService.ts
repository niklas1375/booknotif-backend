import { getDatabase } from '../database/db';
import { onleiheService } from './onleiheService';

export class OnleiheCheckService {
  /**
   * Check Onleihe availability for books that have active user subscriptions
   * This is the main function that will be called by the cron job
   */
  async checkOnleiheAvailability(): Promise<void> {
    console.log('Starting Onleihe availability check...');

    try {
      const db = getDatabase();

      // Get all books that have at least one user subscription and haven't been found in Onleihe yet
      const booksToCheck = await db
        .selectFrom('books')
        .innerJoin('user_book_subscriptions', 'books.id', 'user_book_subscriptions.book_id')
        .innerJoin('authors', 'books.author_id', 'authors.id')
        .select([
          'books.id',
          'books.title',
          'books.onleihe_available',
          'authors.name as author_name',
        ])
        .where('books.onleihe_available', '=', 0) // Only check books not yet found in Onleihe
        .distinct()
        .execute();

      console.log(`Found ${booksToCheck.length} books with subscriptions to check in Onleihe`);

      for (const book of booksToCheck) {
        await this.checkBookInOnleihe(book.id, book.title, book.author_name);
      }

      console.log('Onleihe availability check completed');
    } catch (error) {
      console.error('Error during Onleihe availability check:', error);
    }
  }

  /**
   * Check if a specific book is available in Onleihe
   * @param bookId The database ID of the book
   * @param title The title of the book
   * @param authorName The name of the author
   */
  private async checkBookInOnleihe(
    bookId: number,
    title: string,
    authorName: string
  ): Promise<void> {
    try {
      console.log(`Checking Onleihe for "${title}" by ${authorName}...`);

      const db = getDatabase();

      // Check if book is available in Onleihe
      const isAvailable = await onleiheService.isBookAvailable(title, authorName);

      // Update the book record with check timestamp
      await db
        .updateTable('books')
        .set({
          onleihe_checked_at: new Date().toISOString(),
        })
        .where('id', '=', bookId)
        .execute();

      if (isAvailable) {
        // Mark book as available in Onleihe
        await db
          .updateTable('books')
          .set({
            onleihe_available: 1,
          })
          .where('id', '=', bookId)
          .execute();

        console.log(`Book "${title}" is now available in Onleihe`);

        // Create notifications for users who have notifications for this book
        await this.createOnleiheNotifications(bookId);
      } else {
        console.log(`Book "${title}" not found in Onleihe`);
      }
    } catch (error) {
      console.error(`Error checking Onleihe for book ${bookId}:`, error);
    }
  }

  /**
   * Create Onleihe availability notifications for users who subscribed to the book
   * @param bookId The database ID of the book
   */
  private async createOnleiheNotifications(bookId: number): Promise<void> {
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

      // Get all users who have subscribed to this book
      const bookSubscriptions = await db
        .selectFrom('user_book_subscriptions')
        .select(['user_id'])
        .where('book_id', '=', bookId)
        .execute();

      if (bookSubscriptions.length === 0) {
        console.log(`No subscribed users to notify for book ${bookId}`);
        return;
      }

      // Create new notifications for Onleihe availability
      for (const subscription of bookSubscriptions) {
        await db
          .insertInto('notifications')
          .values({
            user_id: subscription.user_id,
            author_id: book.author_id,
            book_id: bookId,
            notification_type: 'onleihe_available',
            status: 'pending',
          })
          .execute();
      }

      console.log(
        `Created ${bookSubscriptions.length} Onleihe availability notification(s)`
      );
    } catch (error) {
      console.error('Error creating Onleihe notifications:', error);
    }
  }
}

export const onleiheCheckService = new OnleiheCheckService();