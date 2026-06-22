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
    const { status } = req.query;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const db = getDatabase();
    let query = db
      .selectFrom('user_book_subscriptions')
      .innerJoin('books', 'user_book_subscriptions.book_id', 'books.id')
      .leftJoin('authors', 'books.author_id', 'authors.id')
      .select([
        'user_book_subscriptions.id as subscription_id',
        'user_book_subscriptions.status',
        'user_book_subscriptions.completed_at',
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
      .where('user_book_subscriptions.user_id', '=', userId);

    // Filter by status if provided
    if (status && typeof status === 'string') {
      query = query.where('user_book_subscriptions.status', '=', status);
    }

    const subscriptions = await query
      .orderBy('user_book_subscriptions.status', 'asc') // Show active first
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

/**
 * Get all library subscriptions for a user
 */
router.get('/:id/library-subscriptions', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const db = getDatabase();
    const subscriptions = await db
      .selectFrom('user_onleihe_libraries')
      .innerJoin('onleihe_libraries', 'user_onleihe_libraries.library_id', 'onleihe_libraries.id')
      .select([
        'user_onleihe_libraries.id as subscription_id',
        'user_onleihe_libraries.created_at as subscribed_at',
        'onleihe_libraries.id as library_id',
        'onleihe_libraries.name as library_name',
        'onleihe_libraries.onleihe_id',
        'onleihe_libraries.description',
      ])
      .where('user_onleihe_libraries.user_id', '=', userId)
      .orderBy('onleihe_libraries.name', 'asc')
      .execute();

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching library subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch library subscriptions' });
  }
});

/**
 * Subscribe a user to an Onleihe library
 */
router.post('/:id/library-subscriptions', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { library_id } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (!library_id) {
      res.status(400).json({ error: 'library_id is required' });
      return;
    }

    const db = getDatabase();

    // Check if user exists
    const user = await db
      .selectFrom('users')
      .select('id')
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if library exists
    const library = await db
      .selectFrom('onleihe_libraries')
      .select('id')
      .where('id', '=', library_id)
      .executeTakeFirst();

    if (!library) {
      res.status(404).json({ error: 'Library not found' });
      return;
    }

    // Check if subscription already exists
    const existingSubscription = await db
      .selectFrom('user_onleihe_libraries')
      .select('id')
      .where('user_id', '=', userId)
      .where('library_id', '=', library_id)
      .executeTakeFirst();

    if (existingSubscription) {
      res.status(409).json({ error: 'User is already subscribed to this library' });
      return;
    }

    // Create subscription
    const result = await db
      .insertInto('user_onleihe_libraries')
      .values({
        user_id: userId,
        library_id,
      })
      .executeTakeFirst();

    const subscriptionId = Number(result.insertId);
    const subscription = await db
      .selectFrom('user_onleihe_libraries')
      .innerJoin('onleihe_libraries', 'user_onleihe_libraries.library_id', 'onleihe_libraries.id')
      .select([
        'user_onleihe_libraries.id as subscription_id',
        'user_onleihe_libraries.created_at as subscribed_at',
        'onleihe_libraries.id as library_id',
        'onleihe_libraries.name as library_name',
        'onleihe_libraries.onleihe_id',
        'onleihe_libraries.description',
      ])
      .where('user_onleihe_libraries.id', '=', subscriptionId)
      .executeTakeFirst();

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error creating library subscription:', error);
    res.status(500).json({ error: 'Failed to create library subscription' });
  }
});

/**
 * Unsubscribe a user from an Onleihe library
 */
router.delete('/:id/library-subscriptions/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const subscriptionId = parseInt(req.params.subscriptionId as string);

    if (isNaN(userId) || isNaN(subscriptionId)) {
      res.status(400).json({ error: 'Invalid user ID or subscription ID' });
      return;
    }

    const db = getDatabase();

    // Check if subscription exists and belongs to the user
    const subscription = await db
      .selectFrom('user_onleihe_libraries')
      .select('id')
      .where('id', '=', subscriptionId)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!subscription) {
      res.status(404).json({ error: 'Library subscription not found' });
      return;
    }

    // Delete subscription
    await db
      .deleteFrom('user_onleihe_libraries')
      .where('id', '=', subscriptionId)
      .execute();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting library subscription:', error);
    res.status(500).json({ error: 'Failed to delete library subscription' });
  }
});

export default router;
