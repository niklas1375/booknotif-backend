# Finished Searches and Relaunch Feature

## Overview
This feature allows users to view their completed book searches and relaunch them if the found book wasn't what they were looking for. When relaunched, the previously found book is marked as ignored and won't be suggested again in future searches.

## Database Schema

### New Table: `user_ignored_books`
Tracks books that users have marked as ignored after relaunching a search.

```sql
CREATE TABLE user_ignored_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  subscription_id INTEGER NOT NULL REFERENCES user_book_subscriptions(id),
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, book_id, subscription_id)
);
```

**Columns:**
- `id` - Primary key
- `user_id` - Foreign key to users table
- `book_id` - Foreign key to books table (the book to ignore)
- `subscription_id` - Foreign key to user_book_subscriptions table (reference to the subscription that found this book)
- `reason` - Optional text field for why the book was ignored (e.g., 'wrong_book', 'not_interested')
- `created_at` - Timestamp when the book was ignored

**Indexes:**
- Unique index on `(user_id, book_id, subscription_id)` to prevent duplicate ignore records

## API Endpoints

See [API Specification](./api-spec.yaml) for detailed OpenAPI documentation.

### Quick Reference

#### Get Finished Searches
```http
GET /users/{userId}/book-subscriptions?status=completed
```

#### Relaunch a Search
```http
POST /books/{bookId}/reactivate
Content-Type: application/json

{
  "user_id": 1,
  "reason": "wrong_book"  // optional
}
```

## Implementation Details

### Service Layer Changes

#### OnleiheCheckService

**New Method: `filterIgnoredBooks()`**
```typescript
private async filterIgnoredBooks(bookId: number, userIds: number[]): Promise<number[]>
```
- Queries the `user_ignored_books` table for the given book and user IDs
- Returns only user IDs who haven't ignored the book
- Called before creating notifications to ensure ignored books are never suggested

**Updated Method: `checkBookAcrossLibraries()`**
- Now only processes subscriptions with `status='active'`
- Filters out ignored books before notifying users
- Logs when books are ignored by all users with access to a library

### Route Changes

**userRoutes.ts**
- Enhanced `GET /users/:id/book-subscriptions` to accept optional `status` query parameter
- Allows filtering by 'active', 'completed', or 'expired' status

**bookRoutes.ts**
- Enhanced `POST /books/:id/reactivate` to:
  - Accept optional `reason` parameter
  - Add found book to ignored list before reactivating
  - Handle duplicate ignore records gracefully

## User Flow

### Viewing Finished Searches
1. User calls `GET /users/{userId}/book-subscriptions?status=completed`
2. System returns all completed book subscriptions with book details
3. User can see which books were found for their searches

### Relaunching a Search
1. User identifies a completed search where the found book wasn't correct
2. User calls `POST /books/{bookId}/reactivate` with their user_id and optional reason
3. System:
   - Validates subscription exists and is completed
   - Adds the found book to the user's ignored list
   - Reactivates the subscription (status → 'active')
   - Resets subscription's created_at timestamp (restarts 1-year timer)
   - Clears previous availability data
   - Deletes previous notifications
4. Next scheduled check searches again, ignoring the previously found book
5. If a different book is found, user receives a new notification

## Example Scenario

### Initial Search
```bash
# User subscribes to find a book
POST /books/123/subscribe
{
  "user_id": 1
}

# System finds the book and marks subscription as completed
# User receives notification
```

### Relaunch After Wrong Book Found
```bash
# 1. View completed searches
GET /users/1/book-subscriptions?status=completed

# Response shows book 123 was found
[
  {
    "subscription_id": 1,
    "status": "completed",
    "book_id": 123,
    "title": "The Great Gatsby",
    "author_name": "F. Scott Fitzgerald"
  }
]

# 2. User realizes it's the wrong edition, relaunches search
POST /books/123/reactivate
{
  "user_id": 1,
  "reason": "wrong_edition"
}

# Response confirms reactivation
{
  "message": "Subscription reactivated successfully. The previously found book will be ignored in future searches."
}

# 3. Next scheduled check searches again
# - Book 123 is now in user's ignored list
# - If a different matching book is found, user gets notified
```

## Benefits

1. **User Control** - Users can retry searches if results weren't satisfactory
2. **Improved Accuracy** - Ignored books won't be suggested again to the same user
3. **Transparency** - Users can see their complete search history
4. **Flexibility** - Optional reason field helps track why books were ignored
5. **Efficiency** - Reuses existing subscription infrastructure
6. **Data Integrity** - Unique constraints prevent duplicate ignore records

## Technical Notes

- The `user_ignored_books` table uses a composite unique index to prevent duplicate ignore records
- The subscription's `created_at` is reset when reactivated to restart the 1-year expiration timer
- The service layer filters ignored books before creating notifications, ensuring they're never suggested again
- All database operations are wrapped in try-catch blocks for error handling
- The feature is backward compatible - existing subscriptions continue to work as before
- Ignored books are specific to each user - the same book can be suggested to different users

## Migration

When deploying this feature, the database will automatically create the `user_ignored_books` table on startup. No manual migration is required.

## Testing Recommendations

1. **Test reactivation flow**
   - Create a subscription
   - Mark it as completed
   - Reactivate it with a reason
   - Verify book is in ignored list

2. **Test filtering**
   - Add books to ignored list
   - Run availability check
   - Verify ignored books are not suggested

3. **Test query parameter**
   - Create subscriptions with different statuses
   - Query with status filter
   - Verify correct filtering

4. **Test edge cases**
   - Reactivate already active subscription (should fail)
   - Reactivate non-existent subscription (should fail)
   - Add duplicate ignore record (should handle gracefully)