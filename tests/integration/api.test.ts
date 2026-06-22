import request from 'supertest';
import express, { Express } from 'express';
import userRoutes from '../../src/routes/userRoutes';
import bookRoutes from '../../src/routes/bookRoutes';
import {
  setupTestDatabase,
  clearTestDatabase,
  createTestUser,
  createTestAuthor,
  createTestBook,
  createBookSubscription,
} from '../helpers/testDb';

describe('API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    app.use('/users', userRoutes);
    app.use('/books', bookRoutes);
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('GET /users/:id/book-subscriptions', () => {
    it('should return all book subscriptions for a user', async () => {
      const userId = await createTestUser('test@example.com');
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Test Book', authorId);
      await createBookSubscription(userId, bookId, 'active');

      const response = await request(app)
        .get(`/users/${userId}/book-subscriptions`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].book_id).toBe(bookId);
      expect(response.body[0].status).toBe('active');
    });

    it('should filter subscriptions by status=completed', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const book1 = await createTestBook('Active Book', authorId);
      const book2 = await createTestBook('Completed Book', authorId);

      await createBookSubscription(userId, book1, 'active');
      await createBookSubscription(userId, book2, 'completed');

      const response = await request(app)
        .get(`/users/${userId}/book-subscriptions?status=completed`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('completed');
      expect(response.body[0].book_id).toBe(book2);
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/users/invalid/book-subscriptions')
        .expect(400);

      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('POST /books/:id/subscribe', () => {
    it('should create a new book subscription', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('New Book', authorId);

      const response = await request(app)
        .post(`/books/${bookId}/subscribe`)
        .send({ user_id: userId })
        .expect(201);

      expect(response.body.message).toBe('Successfully subscribed to book');
    });

    it('should return 409 if already subscribed', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);
      await createBookSubscription(userId, bookId);

      const response = await request(app)
        .post(`/books/${bookId}/subscribe`)
        .send({ user_id: userId })
        .expect(409);

      expect(response.body.error).toBe('Already subscribed to this book');
    });

    it('should return 400 if user_id is missing', async () => {
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);

      const response = await request(app)
        .post(`/books/${bookId}/subscribe`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('User ID is required');
    });

    it('should return 404 if book does not exist', async () => {
      const userId = await createTestUser();

      const response = await request(app)
        .post('/books/99999/subscribe')
        .send({ user_id: userId })
        .expect(404);

      expect(response.body.error).toBe('Book not found');
    });
  });

  describe('POST /books/:id/reactivate', () => {
    it('should reactivate a completed subscription', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);
      await createBookSubscription(userId, bookId, 'completed');

      const response = await request(app)
        .post(`/books/${bookId}/reactivate`)
        .send({ user_id: userId, reason: 'wrong_book' })
        .expect(200);

      expect(response.body.message).toContain('reactivated successfully');
      expect(response.body.message).toContain('ignored');
    });

    it('should return 400 if subscription is already active', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);
      await createBookSubscription(userId, bookId, 'active');

      const response = await request(app)
        .post(`/books/${bookId}/reactivate`)
        .send({ user_id: userId })
        .expect(400);

      expect(response.body.error).toBe('Subscription is already active');
    });

    it('should return 404 if subscription does not exist', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);

      const response = await request(app)
        .post(`/books/${bookId}/reactivate`)
        .send({ user_id: userId })
        .expect(404);

      expect(response.body.error).toBe('Subscription not found');
    });

    it('should return 400 if user_id is missing', async () => {
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);

      const response = await request(app)
        .post(`/books/${bookId}/reactivate`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('User ID is required');
    });

    it('should accept optional reason parameter', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);
      await createBookSubscription(userId, bookId, 'completed');

      const response = await request(app)
        .post(`/books/${bookId}/reactivate`)
        .send({ user_id: userId, reason: 'wrong_edition' })
        .expect(200);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('DELETE /books/:id/subscribe', () => {
    it('should unsubscribe from a book', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);
      await createBookSubscription(userId, bookId);

      const response = await request(app)
        .delete(`/books/${bookId}/subscribe`)
        .send({ user_id: userId })
        .expect(200);

      expect(response.body.message).toBe('Successfully unsubscribed from book');
    });

    it('should return 404 if subscription does not exist', async () => {
      const userId = await createTestUser();
      const authorId = await createTestAuthor();
      const bookId = await createTestBook('Book', authorId);

      const response = await request(app)
        .delete(`/books/${bookId}/subscribe`)
        .send({ user_id: userId })
        .expect(404);

      expect(response.body.error).toBe('Subscription not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid book ID format', async () => {
      const userId = await createTestUser();

      const response = await request(app)
        .post('/books/invalid/subscribe')
        .send({ user_id: userId })
        .expect(400);

      expect(response.body.error).toBe('Invalid book ID');
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking the database to simulate an error
      // For now, we'll just verify the endpoint exists
      const response = await request(app)
        .get('/users/1/book-subscriptions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});