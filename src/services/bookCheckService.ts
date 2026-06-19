import { getDatabase } from '../database/db';
import { googleBooksService } from './googleBooksService';

export class BookCheckService {
  /**
   * Check for new books from all subscribed authors
   * This is the main function that will be called by the cron job
   */
  async checkForNewBooks(): Promise<void> {
    console.log('Starting book check for subscribed authors...');
    
    try {
      const db = getDatabase();
      
      // Get all authors that have at least one subscriber
      const subscribedAuthors = await db
        .selectFrom('authors')
        .innerJoin('user_author_subscriptions', 'authors.id', 'user_author_subscriptions.author_id')
        .select(['authors.id', 'authors.name', 'authors.external_id'])
        .distinct()
        .execute();

      console.log(`Found ${subscribedAuthors.length} authors with subscribers`);

      for (const author of subscribedAuthors) {
        await this.checkAuthorForNewBooks(author.id, author.name);
      }

      console.log('Book check completed');
    } catch (error) {
      console.error('Error during book check:', error);
    }
  }

  /**
   * Check for new books from a specific author
   * @param authorId The database ID of the author
   * @param authorName The name of the author
   */
  private async checkAuthorForNewBooks(authorId: number, authorName: string): Promise<void> {
    try {
      console.log(`Checking for new books by ${authorName}...`);
      
      const db = getDatabase();
      
      // Get the most recent book from Google Books API
      const latestBook = await googleBooksService.getMostRecentBook(authorName);
      
      if (!latestBook) {
        console.log(`No books found for ${authorName}`);
        return;
      }

      const isbn = googleBooksService.extractISBN(latestBook);
      const title = latestBook.volumeInfo.title;
      const publishedDate = latestBook.volumeInfo.publishedDate || null;

      // Check if this book already exists in our database
      const existingBook = isbn
        ? await db
            .selectFrom('books')
            .select(['id'])
            .where('isbn', '=', isbn)
            .executeTakeFirst()
        : await db
            .selectFrom('books')
            .select(['id'])
            .where('title', '=', title)
            .where('author_id', '=', authorId)
            .executeTakeFirst();

      if (existingBook) {
        console.log(`Book "${title}" already exists in database`);
        return;
      }

      // Insert the new book
      const insertResult = await db
        .insertInto('books')
        .values({
          title,
          author_id: authorId,
          isbn: isbn,
          published_date: publishedDate,
        })
        .executeTakeFirst();

      const bookId = Number(insertResult.insertId);
      console.log(`New book found: "${title}" by ${authorName}`);

      // Create notifications for all subscribers of this author
      await this.createNotificationsForSubscribers(authorId, bookId);
    } catch (error) {
      console.error(`Error checking books for ${authorName}:`, error);
    }
  }

  /**
   * Create notification records for all subscribers of an author
   * @param authorId The database ID of the author
   * @param bookId The database ID of the new book
   */
  private async createNotificationsForSubscribers(authorId: number, bookId: number): Promise<void> {
    try {
      const db = getDatabase();
      
      // Get all users subscribed to this author
      const subscribers = await db
        .selectFrom('user_author_subscriptions')
        .select(['user_id'])
        .where('author_id', '=', authorId)
        .execute();

      if (subscribers.length === 0) {
        console.log(`No subscribers found for author ID ${authorId}`);
        return;
      }

      // Create notification records for each subscriber
      for (const subscriber of subscribers) {
        await db
          .insertInto('notifications')
          .values({
            user_id: subscriber.user_id,
            author_id: authorId,
            book_id: bookId,
            notification_type: 'new_book',
            status: 'pending',
          })
          .execute();
      }

      console.log(`Created ${subscribers.length} notification(s) for new book`);
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  }
}

export const bookCheckService = new BookCheckService();