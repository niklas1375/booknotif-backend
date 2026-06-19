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
    .addColumn('sent_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP').notNull())
    .execute();

  console.log('Database tables created successfully');
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.destroy();
    console.log('Database connection closed');
  }
};