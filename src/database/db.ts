import { Kysely, SqliteDialect } from 'kysely';
import SQLite from 'better-sqlite3';
import path from 'path';
import { Database } from './types';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/booknotif.db');

let db: Kysely<Database>;

export const getDatabase = (): Kysely<Database> => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  const dialect = new SqliteDialect({
    database: new SQLite(DB_PATH),
  });

  db = new Kysely<Database>({
    dialect,
  });

  console.log(`Connected to SQLite database at ${DB_PATH}`);

  // Create tables
  await createTables();
};

const createTables = async (): Promise<void> => {
  // Create users table
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .addColumn('updated_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create authors table
  await db.schema
    .createTable('authors')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('external_id', 'text')
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create books table
  await db.schema
    .createTable('books')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('author_id', 'integer', (col) => col.references('authors.id'))
    .addColumn('isbn', 'text')
    .addColumn('published_date', 'text')
    .addColumn('onleihe_available', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('onleihe_checked_at', 'text')
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create notifications table
  await db.schema
    .createTable('notifications')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('author_id', 'integer', (col) => col.notNull().references('authors.id'))
    .addColumn('book_id', 'integer', (col) => col.references('books.id'))
    .addColumn('notification_type', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.defaultTo('pending').notNull())
    .addColumn('error_message', 'text')
    .addColumn('sent_at', 'text')
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create user_author_subscriptions table
  await db.schema
    .createTable('user_author_subscriptions')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('author_id', 'integer', (col) => col.notNull().references('authors.id'))
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create unique index on user_id and author_id to prevent duplicate subscriptions
  await db.schema
    .createIndex('idx_user_author_subscriptions_unique')
    .ifNotExists()
    .on('user_author_subscriptions')
    .columns(['user_id', 'author_id'])
    .unique()
    .execute();

  // Create user_book_subscriptions table
  await db.schema
    .createTable('user_book_subscriptions')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('book_id', 'integer', (col) => col.notNull().references('books.id'))
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create unique index on user_id and book_id to prevent duplicate subscriptions
  await db.schema
    .createIndex('idx_user_book_subscriptions_unique')
    .ifNotExists()
    .on('user_book_subscriptions')
    .columns(['user_id', 'book_id'])
    .unique()
    .execute();

  // Create onleihe_libraries table
  await db.schema
    .createTable('onleihe_libraries')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('onleihe_id', 'text', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create user_onleihe_libraries table
  await db.schema
    .createTable('user_onleihe_libraries')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('library_id', 'integer', (col) => col.notNull().references('onleihe_libraries.id'))
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create unique index on user_id and library_id to prevent duplicate library subscriptions
  await db.schema
    .createIndex('idx_user_onleihe_libraries_unique')
    .ifNotExists()
    .on('user_onleihe_libraries')
    .columns(['user_id', 'library_id'])
    .unique()
    .execute();

  // Create book_onleihe_availability table
  await db.schema
    .createTable('book_onleihe_availability')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('book_id', 'integer', (col) => col.notNull().references('books.id'))
    .addColumn('library_id', 'integer', (col) => col.notNull().references('onleihe_libraries.id'))
    .addColumn('is_available', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('checked_at', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  // Create unique index on book_id and library_id to prevent duplicate availability records
  await db.schema
    .createIndex('idx_book_onleihe_availability_unique')
    .ifNotExists()
    .on('book_onleihe_availability')
    .columns(['book_id', 'library_id'])
    .unique()
    .execute();

  console.log('Database tables created successfully');
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.destroy();
    console.log('Database connection closed');
  }
};