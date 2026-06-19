import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/db';

const router = Router();

/**
 * Get all users
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const users = await db
      .selectFrom('users')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get a specific user by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const userId = parseInt(req.params.id as string);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * Create a new user
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const db = getDatabase();

    // Check if user already exists
    const existingUser = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', email)
      .executeTakeFirst();

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const result = await db
      .insertInto('users')
      .values({
        email,
      })
      .executeTakeFirst();

    const userId = Number(result.insertId);
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst();

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Get all author subscriptions for a user
 */
router.get('/:id/author-subscriptions', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const db = getDatabase();
    const subscriptions = await db
      .selectFrom('user_author_subscriptions')
      .innerJoin('authors', 'user_author_subscriptions.author_id', 'authors.id')
      .select([
        'user_author_subscriptions.id as subscription_id',
        'user_author_subscriptions.created_at as subscribed_at',
        'authors.id as author_id',
        'authors.name as author_name',
        'authors.external_id',
      ])
      .where('user_author_subscriptions.user_id', '=', userId)
      .orderBy('authors.name', 'asc')
      .execute();

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching author subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch author subscriptions' });
  }
});

/**
 * Get all book subscriptions for a user
 */
router.get('/:id/book-subscriptions', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const db = getDatabase();
    const subscriptions = await db
      .selectFrom('user_book_subscriptions')
      .innerJoin('books', 'user_book_subscriptions.book_id', 'books.id')
      .leftJoin('authors', 'books.author_id', 'authors.id')
      .select([
        'user_book_subscriptions.id as subscription_id',
        'user_book_subscriptions.created_at as subscribed_at',
        'books.id as book_id',
        'books.title',
        'books.isbn',
        'books.published_date',
        'books.onleihe_available',
        'books.onleihe_checked_at',
        'authors.id as author_id',
        'authors.name as author_name',
      ])
      .where('user_book_subscriptions.user_id', '=', userId)
      .orderBy('books.created_at', 'desc')
      .execute();

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching book subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch book subscriptions' });
  }
});

/**
 * Get all notifications for a user
 */
router.get('/:id/notifications', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const db = getDatabase();
    const notifications = await db
      .selectFrom('notifications')
      .innerJoin('authors', 'notifications.author_id', 'authors.id')
      .leftJoin('books', 'notifications.book_id', 'books.id')
      .select([
        'notifications.id',
        'notifications.sent_at',
        'authors.id as author_id',
        'authors.name as author_name',
        'books.id as book_id',
        'books.title as book_title',
        'books.onleihe_available',
      ])
      .where('notifications.user_id', '=', userId)
      .orderBy('notifications.sent_at', 'desc')
      .execute();

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;