import { getDatabase } from '../../src/database/db';
import {
  setupTestDatabase,
  clearTestDatabase,
  createTestUser,
  createTestAuthor,
  createTestBook,
  createTestLibrary,
} from '../helpers/testDb';

describe('Database Operations', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('User Operations', () => {
    it('should create a user', async () => {
      const userId = await createTestUser('user@test.com');
      expect(userId).toBeGreaterThan(0);

      const db = getDatabase();
      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', userId)
        .executeTakeFirst();

      expect(user).toBeDefined();
      expect(user?.email).toBe('user@test.com');
    });

    it('should not allow duplicate emails', async () => {
      await createTestUser('duplicate@test.com');
      
      await expect(
        createTestUser('duplicate@test.com')
      ).rejects.toThrow();
    });
  });

  describe('Author Operations', () => {
    it('should create an author', async () => {
      const authorId = await createTestAuthor('John Doe', 'ext-123');
      expect(authorId).toBeGreaterThan(0);

      const db = getDatabase();
      const author = await db
        .selectFrom('authors')
        .selectAll()
        .where('id', '=', authorId)
        .executeTakeFirst();

      expect(author).toBeDefined();
      expect(author?.name).toBe('John Doe');
      expect(author?.external_id).toBe('ext-123');
    });
  });

  describe('Book Operations', () => {
    it('should create a book with author', async () => {
      const authorId = await createTestAuthor('Jane Smith');
      const bookId = await createTestBook('Test Book', authorId, '1234567890');

      const db = getDatabase();
      const book = await db
        .selectFrom('books')
        .selectAll()
        .where('id', '=', bookId)
        .executeTakeFirst();

      expect(book).toBeDefined();
      expect(book?.title).toBe('Test Book');
      expect(book?.author_id).toBe(authorId);
      expect(book?.isbn).toBe('1234567890');
    });

    it('should handle books without ISBN', async () => {
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book Without ISBN', authorId, null);

      const db = getDatabase();
      const book = await db
        .selectFrom('books')
        .selectAll()
        .where('id', '=', bookId)
        .executeTakeFirst();

      expect(book).toBeDefined();
      expect(book?.isbn).toBeNull();
    });
  });

  describe('Library Operations', () => {
    it('should create a library', async () => {
      const libraryId = await createTestLibrary('City Library', 'city-lib');

      const db = getDatabase();
      const library = await db
        .selectFrom('onleihe_libraries')
        .selectAll()
        .where('id', '=', libraryId)
        .executeTakeFirst();

      expect(library).toBeDefined();
      expect(library?.name).toBe('City Library');
      expect(library?.onleihe_id).toBe('city-lib');
    });

    it('should not allow duplicate onleihe_id', async () => {
      await createTestLibrary('Library 1', 'same-id');
      
      await expect(
        createTestLibrary('Library 2', 'same-id')
      ).rejects.toThrow();
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key on books.author_id', async () => {
      const db = getDatabase();
      
      await expect(
        db.insertInto('books')
          .values({
            title: 'Orphan Book',
            author_id: 99999, // Non-existent author
          })
          .execute()
      ).rejects.toThrow();
    });

    it('should prevent deleting author with associated books', async () => {
      const authorId = await createTestAuthor();
      await createTestBook('Book to Delete', authorId);

      const db = getDatabase();
      
      // Attempting to delete author with books should fail due to FK constraint
      await expect(
        db.deleteFrom('authors').where('id', '=', authorId).execute()
      ).rejects.toThrow();
    });
  });
});