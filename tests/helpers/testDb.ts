import { getDatabase, initDatabase } from '../../src/database/db';

/**
 * Initialize a fresh test database
 */
export async function setupTestDatabase() {
  await initDatabase();
  return getDatabase();
}

/**
 * Clear all data from test database tables
 */
export async function clearTestDatabase() {
  const db = getDatabase();
  
  // Delete in order to respect foreign key constraints
  await db.deleteFrom('user_ignored_books').execute();
  await db.deleteFrom('notifications').execute();
  await db.deleteFrom('user_book_subscriptions').execute();
  await db.deleteFrom('user_author_subscriptions').execute();
  await db.deleteFrom('user_onleihe_libraries').execute();
  await db.deleteFrom('book_onleihe_availability').execute();
  await db.deleteFrom('books').execute();
  await db.deleteFrom('authors').execute();
  await db.deleteFrom('onleihe_libraries').execute();
  await db.deleteFrom('users').execute();
}

/**
 * Create a test user
 */
export async function createTestUser(email: string = 'test@example.com') {
  const db = getDatabase();
  const result = await db
    .insertInto('users')
    .values({ email })
    .executeTakeFirst();
  
  return Number(result.insertId);
}

/**
 * Create a test author
 */
export async function createTestAuthor(name: string = 'Test Author', externalId: string | null = null) {
  const db = getDatabase();
  const result = await db
    .insertInto('authors')
    .values({ name, external_id: externalId })
    .executeTakeFirst();
  
  return Number(result.insertId);
}

/**
 * Create a test book
 */
export async function createTestBook(
  title: string = 'Test Book',
  authorId: number,
  isbn: string | null = null
) {
  const db = getDatabase();
  const result = await db
    .insertInto('books')
    .values({
      title,
      author_id: authorId,
      isbn,
    })
    .executeTakeFirst();
  
  return Number(result.insertId);
}

/**
 * Create a test library
 */
export async function createTestLibrary(
  name: string = 'Test Library',
  onleiheId: string = 'test-lib'
) {
  const db = getDatabase();
  const result = await db
    .insertInto('onleihe_libraries')
    .values({
      name,
      onleihe_id: onleiheId,
    })
    .executeTakeFirst();
  
  return Number(result.insertId);
}

/**
 * Create a book subscription
 */
export async function createBookSubscription(
  userId: number,
  bookId: number,
  status: 'active' | 'completed' | 'expired' = 'active'
) {
  const db = getDatabase();
  const result = await db
    .insertInto('user_book_subscriptions')
    .values({
      user_id: userId,
      book_id: bookId,
      status,
    })
    .executeTakeFirst();
  
  return Number(result.insertId);
}

/**
 * Create a user library subscription
 */
export async function createUserLibrarySubscription(userId: number, libraryId: number) {
  const db = getDatabase();
  const result = await db
    .insertInto('user_onleihe_libraries')
    .values({
      user_id: userId,
      library_id: libraryId,
    })
    .executeTakeFirst();
  
  return Number(result.insertId);
}

/**
 * Add a book to user's ignored list
 */
export async function addIgnoredBook(
  userId: number,
  bookId: number,
  subscriptionId: number,
  reason: string | null = null
) {
  const db = getDatabase();
  const result = await db
    .insertInto('user_ignored_books')
    .values({
      user_id: userId,
      book_id: bookId,
      subscription_id: subscriptionId,
      reason,
    })
    .executeTakeFirst();
  
  return Number(result.insertId);
}