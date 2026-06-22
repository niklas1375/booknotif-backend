import { getDatabase } from '../../src/database/db';
import {
  setupTestDatabase,
  clearTestDatabase,
  createTestUser,
  createTestAuthor,
  createTestBook,
  createTestLibrary,
  createBookSubscription,
  createUserLibrarySubscription,
  addIgnoredBook,
} from '../helpers/testDb';

describe('Finished Searches Feature', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('Book Subscription Status Filtering', () => {
    it('should filter subscriptions by status', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const book1 = await createTestBook('Active Book', authorId);
      const book2 = await createTestBook('Completed Book', authorId);
      const book3 = await createTestBook('Expired Book', authorId);

      await createBookSubscription(userId, book1, 'active');
      await createBookSubscription(userId, book2, 'completed');
      await createBookSubscription(userId, book3, 'expired');

      const db = getDatabase();

      // Get completed subscriptions
      const completedSubs = await db
        .selectFrom('user_book_subscriptions')
        .selectAll()
        .where('user_id', '=', userId)
        .where('status', '=', 'completed')
        .execute();

      expect(completedSubs).toHaveLength(1);
      expect(completedSubs[0].book_id).toBe(book2);
    });

    it('should return all subscriptions when no filter is applied', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const book1 = await createTestBook('Book 1', authorId);
      const book2 = await createTestBook('Book 2', authorId);

      await createBookSubscription(userId, book1, 'active');
      await createBookSubscription(userId, book2, 'completed');

      const db = getDatabase();
      const allSubs = await db
        .selectFrom('user_book_subscriptions')
        .selectAll()
        .where('user_id', '=', userId)
        .execute();

      expect(allSubs).toHaveLength(2);
    });
  });

  describe('Ignored Books', () => {
    it('should add a book to ignored list', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book to Ignore', authorId);
      const subscriptionId = await createBookSubscription(userId, bookId, 'completed');

      const ignoredId = await addIgnoredBook(userId, bookId, subscriptionId, 'wrong_book');
      expect(ignoredId).toBeGreaterThan(0);

      const db = getDatabase();
      const ignored = await db
        .selectFrom('user_ignored_books')
        .selectAll()
        .where('id', '=', ignoredId)
        .executeTakeFirst();

      expect(ignored).toBeDefined();
      expect(ignored?.user_id).toBe(userId);
      expect(ignored?.book_id).toBe(bookId);
      expect(ignored?.reason).toBe('wrong_book');
    });

    it('should not allow duplicate ignored book entries', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);
      const subscriptionId = await createBookSubscription(userId, bookId);

      await addIgnoredBook(userId, bookId, subscriptionId);

      // Try to add the same book again
      await expect(
        addIgnoredBook(userId, bookId, subscriptionId)
      ).rejects.toThrow();
    });

    it('should allow same book to be ignored by different users', async () => {
      const user1 = await createTestUser('user1@test.com');
      const user2 = await createTestUser('user2@test.com');
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Shared Book', authorId);
      
      const sub1 = await createBookSubscription(user1, bookId);
      const sub2 = await createBookSubscription(user2, bookId);

      const ignored1 = await addIgnoredBook(user1, bookId, sub1);
      const ignored2 = await addIgnoredBook(user2, bookId, sub2);

      expect(ignored1).toBeGreaterThan(0);
      expect(ignored2).toBeGreaterThan(0);
      expect(ignored1).not.toBe(ignored2);
    });
  });

  describe('Subscription Reactivation', () => {
    it('should reactivate a completed subscription', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);
      const subscriptionId = await createBookSubscription(userId, bookId, 'completed');

      const db = getDatabase();

      // Mark as completed
      await db
        .updateTable('user_book_subscriptions')
        .set({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .where('id', '=', subscriptionId)
        .execute();

      // Reactivate
      await db
        .updateTable('user_book_subscriptions')
        .set({
          status: 'active',
          completed_at: null,
          created_at: new Date().toISOString() as any,
        })
        .where('id', '=', subscriptionId)
        .execute();

      const subscription = await db
        .selectFrom('user_book_subscriptions')
        .selectAll()
        .where('id', '=', subscriptionId)
        .executeTakeFirst();

      expect(subscription?.status).toBe('active');
      expect(subscription?.completed_at).toBeNull();
    });

    it('should add book to ignored list when reactivating', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);
      const subscriptionId = await createBookSubscription(userId, bookId, 'completed');

      // Add to ignored list (simulating reactivation)
      await addIgnoredBook(userId, bookId, subscriptionId, 'wrong_edition');

      const db = getDatabase();
      const ignored = await db
        .selectFrom('user_ignored_books')
        .selectAll()
        .where('user_id', '=', userId)
        .where('book_id', '=', bookId)
        .executeTakeFirst();

      expect(ignored).toBeDefined();
      expect(ignored?.reason).toBe('wrong_edition');
    });
  });

  describe('Ignored Books Filtering in Service', () => {
    it('should filter out ignored books for a user', async () => {
      const user1 = await createTestUser('user1@test.com');
      const user2 = await createTestUser('user2@test.com');
      const authorId = await createTestAuthor();
      const book1 = await createTestBook('Book 1', authorId);
      const book2 = await createTestBook('Book 2', authorId);

      const sub1 = await createBookSubscription(user1, book1);
      await createBookSubscription(user2, book1);

      // User 1 ignores book 1
      await addIgnoredBook(user1, book1, sub1);

      const db = getDatabase();

      // Get books that user1 should NOT see (ignored books)
      const ignoredForUser1 = await db
        .selectFrom('user_ignored_books')
        .select('book_id')
        .where('user_id', '=', user1)
        .execute();

      expect(ignoredForUser1).toHaveLength(1);
      expect(ignoredForUser1[0].book_id).toBe(book1);

      // User 2 should still see book 1 (not ignored by them)
      const ignoredForUser2 = await db
        .selectFrom('user_ignored_books')
        .select('book_id')
        .where('user_id', '=', user2)
        .execute();

      expect(ignoredForUser2).toHaveLength(0);
    });

    it('should handle multiple ignored books per user', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const book1 = await createTestBook('Book 1', authorId);
      const book2 = await createTestBook('Book 2', authorId);
      const book3 = await createTestBook('Book 3', authorId);

      const sub1 = await createBookSubscription(userId, book1, 'completed');
      const sub2 = await createBookSubscription(userId, book2, 'completed');
      await createBookSubscription(userId, book3, 'active');

      await addIgnoredBook(userId, book1, sub1);
      await addIgnoredBook(userId, book2, sub2);

      const db = getDatabase();
      const ignoredBooks = await db
        .selectFrom('user_ignored_books')
        .select('book_id')
        .where('user_id', '=', userId)
        .execute();

      expect(ignoredBooks).toHaveLength(2);
      expect(ignoredBooks.map(b => b.book_id)).toContain(book1);
      expect(ignoredBooks.map(b => b.book_id)).toContain(book2);
      expect(ignoredBooks.map(b => b.book_id)).not.toContain(book3);
    });
  });

  describe('Complete Reactivation Workflow', () => {
    it('should complete full reactivation workflow', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Test Book', authorId);
      const libraryId = await createTestLibrary();
      
      // Create subscription and library subscription
      const subscriptionId = await createBookSubscription(userId, bookId, 'completed');
      await createUserLibrarySubscription(userId, libraryId);

      const db = getDatabase();

      // Mark subscription as completed
      await db
        .updateTable('user_book_subscriptions')
        .set({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .where('id', '=', subscriptionId)
        .execute();

      // Simulate reactivation process
      // 1. Add to ignored list
      await addIgnoredBook(userId, bookId, subscriptionId, 'wrong_book');

      // 2. Reactivate subscription
      await db
        .updateTable('user_book_subscriptions')
        .set({
          status: 'active',
          completed_at: null,
          created_at: new Date().toISOString() as any,
        })
        .where('id', '=', subscriptionId)
        .execute();

      // 3. Clear availability data
      await db
        .deleteFrom('book_onleihe_availability')
        .where('book_id', '=', bookId)
        .where('is_available', '=', 1)
        .execute();

      // 4. Delete notifications
      await db
        .deleteFrom('notifications')
        .where('user_id', '=', userId)
        .where('book_id', '=', bookId)
        .execute();

      // Verify final state
      const subscription = await db
        .selectFrom('user_book_subscriptions')
        .selectAll()
        .where('id', '=', subscriptionId)
        .executeTakeFirst();

      const ignored = await db
        .selectFrom('user_ignored_books')
        .selectAll()
        .where('user_id', '=', userId)
        .where('book_id', '=', bookId)
        .executeTakeFirst();

      expect(subscription?.status).toBe('active');
      expect(subscription?.completed_at).toBeNull();
      expect(ignored).toBeDefined();
      expect(ignored?.reason).toBe('wrong_book');
    });
  });
});