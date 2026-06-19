import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/db';

const router = Router();

/**
 * Get all books
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const books = await db
      .selectFrom('books')
      .leftJoin('authors', 'books.author_id', 'authors.id')
      .select([
        'books.id',
        'books.title',
        'books.author_id',
        'books.isbn',
        'books.published_date',
        'books.onleihe_available',
        'books.onleihe_checked_at',
        'books.created_at',
        'authors.name as author_name',
      ])
      .orderBy('books.created_at', 'desc')
      .execute();

    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

/**
 * Get a specific book by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const bookId = parseInt(req.params.id as string);

    if (isNaN(bookId)) {
      res.status(400).json({ error: 'Invalid book ID' });
      return;
    }

    const book = await db
      .selectFrom('books')
      .leftJoin('authors', 'books.author_id', 'authors.id')
      .select([
        'books.id',
        'books.title',
        'books.author_id',
        'books.isbn',
        'books.published_date',
        'books.onleihe_available',
        'books.onleihe_checked_at',
        'books.created_at',
        'authors.name as author_name',
      ])
      .where('books.id', '=', bookId)
      .executeTakeFirst();

    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

/**
 * Subscribe a user to a book (for Onleihe notifications)
 */
router.post('/:id/subscribe', async (req: Request, res: Response) => {
  try {
    const bookId = parseInt(req.params.id as string);
    const { user_id } = req.body;

    if (isNaN(bookId)) {
      res.status(400).json({ error: 'Invalid book ID' });
      return;
    }

    if (!user_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const db = getDatabase();

    // Check if book exists
    const book = await db
      .selectFrom('books')
      .select('id')
      .where('id', '=', bookId)
      .executeTakeFirst();

    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    // Check if subscription already exists
    const existingSubscription = await db
      .selectFrom('user_book_subscriptions')
      .select('id')
      .where('user_id', '=', user_id)
      .where('book_id', '=', bookId)
      .executeTakeFirst();

    if (existingSubscription) {
      res.status(409).json({ error: 'Already subscribed to this book' });
      return;
    }

    // Create subscription
    await db
      .insertInto('user_book_subscriptions')
      .values({
        user_id,
        book_id: bookId,
      })
      .execute();

    res.status(201).json({ message: 'Successfully subscribed to book' });
  } catch (error) {
    console.error('Error subscribing to book:', error);
    res.status(500).json({ error: 'Failed to subscribe to book' });
  }
});

/**
 * Unsubscribe a user from a book
 */
router.delete('/:id/subscribe', async (req: Request, res: Response) => {
  try {
    const bookId = parseInt(req.params.id as string);
    const { user_id } = req.body;

    if (isNaN(bookId)) {
      res.status(400).json({ error: 'Invalid book ID' });
      return;
    }

    if (!user_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const db = getDatabase();

    const result = await db
      .deleteFrom('user_book_subscriptions')
      .where('user_id', '=', user_id)
      .where('book_id', '=', bookId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json({ message: 'Successfully unsubscribed from book' });
  } catch (error) {
    console.error('Error unsubscribing from book:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from book' });
  }
});

export default router;