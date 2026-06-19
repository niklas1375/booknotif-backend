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
  onleihe_available: ColumnType<number, number | undefined, number>; // SQLite uses 0/1 for boolean
  onleihe_checked_at: ColumnType<Date, string | undefined, string> | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface NotificationsTable {
  id: ColumnType<number, never, never>;
  user_id: number;
  author_id: number;
  book_id: number | null;
  notification_type: string; // 'new_book' or 'onleihe_available'
  status: string; // 'pending', 'sent', 'failed'
  error_message: string | null;
  sent_at: ColumnType<Date, string | undefined, never>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface UserAuthorSubscriptionsTable {
  id: ColumnType<number, never, never>;
  user_id: number;
  author_id: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface UserBookSubscriptionsTable {
  id: ColumnType<number, never, never>;
  user_id: number;
  book_id: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Database interface
export interface Database {
  users: UsersTable;
  authors: AuthorsTable;
  books: BooksTable;
  notifications: NotificationsTable;
  user_author_subscriptions: UserAuthorSubscriptionsTable;
  user_book_subscriptions: UserBookSubscriptionsTable;
}
