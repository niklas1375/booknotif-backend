import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/db';

const router = Router();

/**
 * Get all authors
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const authors = await db
      .selectFrom('authors')
      .selectAll()
      .orderBy('name', 'asc')
      .execute();

    res.json(authors);
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

/**
 * Get a specific author by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const authorId = parseInt(req.params.id as string);

    if (isNaN(authorId)) {
      res.status(400).json({ error: 'Invalid author ID' });
      return;
    }

    const author = await db
      .selectFrom('authors')
      .selectAll()
      .where('id', '=', authorId)
      .executeTakeFirst();

    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    res.json(author);
  } catch (error) {
    console.error('Error fetching author:', error);
    res.status(500).json({ error: 'Failed to fetch author' });
  }
});

/**
 * Create a new author
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, external_id } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Author name is required' });
      return;
    }

    const db = getDatabase();
    const result = await db
      .insertInto('authors')
      .values({
        name,
        external_id: external_id || null,
      })
      .executeTakeFirst();

    const authorId = Number(result.insertId);
    const author = await db
      .selectFrom('authors')
      .selectAll()
      .where('id', '=', authorId)
      .executeTakeFirst();

    res.status(201).json(author);
  } catch (error) {
    console.error('Error creating author:', error);
    res.status(500).json({ error: 'Failed to create author' });
  }
});

/**
 * Subscribe a user to an author
 */
router.post('/:id/subscribe', async (req: Request, res: Response) => {
  try {
    const authorId = parseInt(req.params.id as string);
    const { user_id } = req.body;

    if (isNaN(authorId)) {
      res.status(400).json({ error: 'Invalid author ID' });
      return;
    }

    if (!user_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const db = getDatabase();

    // Check if author exists
    const author = await db
      .selectFrom('authors')
      .select('id')
      .where('id', '=', authorId)
      .executeTakeFirst();

    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    // Check if subscription already exists
    const existingSubscription = await db
      .selectFrom('user_author_subscriptions')
      .select('id')
      .where('user_id', '=', user_id)
      .where('author_id', '=', authorId)
      .executeTakeFirst();

    if (existingSubscription) {
      res.status(409).json({ error: 'Already subscribed to this author' });
      return;
    }

    // Create subscription
    await db
      .insertInto('user_author_subscriptions')
      .values({
        user_id,
        author_id: authorId,
      })
      .execute();

    res.status(201).json({ message: 'Successfully subscribed to author' });
  } catch (error) {
    console.error('Error subscribing to author:', error);
    res.status(500).json({ error: 'Failed to subscribe to author' });
  }
});

/**
 * Unsubscribe a user from an author
 */
router.delete('/:id/subscribe', async (req: Request, res: Response) => {
  try {
    const authorId = parseInt(req.params.id as string);
    const { user_id } = req.body;

    if (isNaN(authorId)) {
      res.status(400).json({ error: 'Invalid author ID' });
      return;
    }

    if (!user_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const db = getDatabase();

    const result = await db
      .deleteFrom('user_author_subscriptions')
      .where('user_id', '=', user_id)
      .where('author_id', '=', authorId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json({ message: 'Successfully unsubscribed from author' });
  } catch (error) {
    console.error('Error unsubscribing from author:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from author' });
  }
});

/**
 * Get all books by an author
 */
router.get('/:id/books', async (req: Request, res: Response) => {
  try {
    const authorId = parseInt(req.params.id as string);

    if (isNaN(authorId)) {
      res.status(400).json({ error: 'Invalid author ID' });
      return;
    }

    const db = getDatabase();
    const books = await db
      .selectFrom('books')
      .selectAll()
      .where('author_id', '=', authorId)
      .orderBy('published_date', 'desc')
      .execute();

    res.json(books);
  } catch (error) {
    console.error('Error fetching author books:', error);
    res.status(500).json({ error: 'Failed to fetch author books' });
  }
});

export default router;