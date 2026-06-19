import { ColumnType } from 'kysely';

// Database table interfaces
export interface UsersTable {
  id: ColumnType<number, never, never>;
  email: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface AuthorsTable {
  id: ColumnType<number, never, never>;
  name: string;
  external_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface BooksTable {
  id: ColumnType<number, never, never>;
  title: string;
  author_id: number | null;
  isbn: string | null;
  published_date: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface NotificationsTable {
  id: ColumnType<number, never, never>;
  user_id: number;
  author_id: number;
  book_id: number | null;
  sent_at: ColumnType<Date, string | undefined, never>;
}

// Database interface
export interface Database {
  users: UsersTable;
  authors: AuthorsTable;
  books: BooksTable;
  notifications: NotificationsTable;
}