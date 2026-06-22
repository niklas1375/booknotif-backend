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
        'books.alternative_search_term',
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
        'books.alternative_search_term',
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
 * Update a book's alternative search term
 */
router.patch('/:id/alternative-search-term', async (req: Request, res: Response) => {
  try {
    const bookId = parseInt(req.params.id as string);
    const { alternative_search_term } = req.body;

    if (isNaN(bookId)) {
      res.status(400).json({ error: 'Invalid book ID' });
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

    // Update alternative search term (can be null to remove it)
    await db
      .updateTable('books')
      .set({
        alternative_search_term: alternative_search_term || null,
      })
      .where('id', '=', bookId)
      .execute();

    // Fetch updated book
    const updatedBook = await db
      .selectFrom('books')
      .leftJoin('authors', 'books.author_id', 'authors.id')
      .select([
        'books.id',
        'books.title',
        'books.author_id',
        'books.isbn',
        'books.published_date',
        'books.alternative_search_term',
        'books.onleihe_available',
        'books.onleihe_checked_at',
        'books.created_at',
        'authors.name as author_name',
      ])
      .where('books.id', '=', bookId)
      .executeTakeFirst();

    res.json(updatedBook);
  } catch (error) {
    console.error('Error updating alternative search term:', error);
    res.status(500).json({ error: 'Failed to update alternative search term' });
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
        status: 'active',
      })
      .execute();

    res.status(201).json({ message: 'Successfully subscribed to book' });
  } catch (error) {
    console.error('Error subscribing to book:', error);
    res.status(500).json({ error: 'Failed to subscribe to book' });
  }
});

/**
 * Reactivate a completed book subscription
 * This resets the subscription to active, marks the previous book as ignored, and clears availability data
 */
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const bookId = parseInt(req.params.id as string);
    const { user_id, reason } = req.body;

    if (isNaN(bookId)) {
      res.status(400).json({ error: 'Invalid book ID' });
      return;
    }

    if (!user_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const db = getDatabase();

    // Check if subscription exists and is completed
    const subscription = await db
      .selectFrom('user_book_subscriptions')
      .select(['id', 'status'])
      .where('user_id', '=', user_id)
      .where('book_id', '=', bookId)
      .executeTakeFirst();

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    if (subscription.status === 'active') {
      res.status(400).json({ error: 'Subscription is already active' });
      return;
    }

    // Add the found book to the ignored books list
    try {
      await db
        .insertInto('user_ignored_books')
        .values({
          user_id,
          book_id: bookId,
          subscription_id: subscription.id,
          reason: reason || null,
        })
        .execute();
    } catch (ignoreError) {
      // If the book is already in the ignored list, that's fine
      console.log('Book already in ignored list or error adding:', ignoreError);
    }

    // Reactivate subscription
    await db
      .updateTable('user_book_subscriptions')
      .set({
        status: 'active',
        completed_at: null,
        created_at: new Date().toISOString() as any, // Reset created_at to restart 1-year timer
      })
      .where('id', '=', subscription.id)
      .execute();

    // Clear previous availability data so the book will be checked again
    await db
      .deleteFrom('book_onleihe_availability')
      .where('book_id', '=', bookId)
      .where('is_available', '=', 1)
      .execute();

    // Delete previous notifications for this user/book
    await db
      .deleteFrom('notifications')
      .where('user_id', '=', user_id)
      .where('book_id', '=', bookId)
      .where('notification_type', '=', 'onleihe_available')
      .execute();

    res.json({ 
      message: 'Subscription reactivated successfully. The previously found book will be ignored in future searches.' 
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
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