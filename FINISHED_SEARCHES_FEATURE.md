# Finished Searches and Relaunch Feature

## Overview
This feature allows users to view their completed book searches and relaunch them if the found book wasn't what they were looking for. When relaunched, the previously found book is marked as ignored and won't be suggested again in future searches.

## Database Changes

### New Table: `user_ignored_books`
Tracks books that users have marked as ignored after relaunching a search.

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

### 1. Get Book Subscriptions (Enhanced)
**Endpoint:** `GET /users/:id/book-subscriptions?status=completed`

**Query Parameters:**
- `status` (optional) - Filter by subscription status: 'active', 'completed', or 'expired'

**Response:** Array of book subscriptions with details

**Example:**
```bash
GET /users/1/book-subscriptions?status=completed
```

This allows users to specifically retrieve their finished searches by filtering for `status=completed`.

### 2. Reactivate Book Subscription (Enhanced)
**Endpoint:** `POST /books/:id/reactivate`

**Request Body:**
```json
{
  "user_id": 1,
  "reason": "wrong_book" // optional
}
```

**Behavior:**
1. Validates that the subscription exists and is completed
2. Adds the found book to the `user_ignored_books` table
3. Reactivates the subscription (sets status to 'active')
4. Resets the subscription's `created_at` timestamp to restart the 1-year timer
5. Clears previous availability data for the book
6. Deletes previous notifications for this user/book combination

**Response:**
```json
{
  "message": "Subscription reactivated successfully. The previously found book will be ignored in future searches."
}
```

## Service Layer Changes

### OnleiheCheckService Updates

#### New Method: `filterIgnoredBooks()`
Filters out books that users have marked as ignored before creating notifications.

**Logic:**
1. Queries the `user_ignored_books` table for the given book and user IDs
2. Returns only user IDs who haven't ignored the book

#### Updated Method: `checkBookAcrossLibraries()`
Enhanced to:
1. Only check subscriptions with `status='active'`
2. Filter out ignored books before notifying users
3. Log when books are ignored by all users

## User Flow

### Viewing Finished Searches
1. User calls `GET /users/{userId}/book-subscriptions?status=completed`
2. System returns all completed book subscriptions with book details
3. User can see which books were found for their searches

### Relaunching a Search
1. User identifies a completed search where the found book wasn't correct
2. User calls `POST /books/{bookId}/reactivate` with their user_id
3. System:
   - Marks the found book as ignored for this user
   - Reactivates the subscription
   - Clears previous search results
4. The next scheduled check will search again, ignoring the previously found book
5. If a different book is found, the user will be notified

## Example Scenario

**Initial Search:**
1. User subscribes to find "The Great Gatsby" by F. Scott Fitzgerald
2. System finds a book and marks subscription as 'completed'
3. User receives notification

**Relaunch:**
1. User realizes the found book was a different edition or wrong book
2. User calls `GET /users/1/book-subscriptions?status=completed` to see finished searches
3. User calls `POST /books/123/reactivate` with `{"user_id": 1, "reason": "wrong_edition"}`
4. System:
   - Adds book 123 to ignored list for user 1
   - Reactivates subscription
   - Clears availability data
5. Next scheduled check searches again, ignoring book 123
6. If a different matching book is found, user gets notified again

## Benefits

1. **User Control:** Users can retry searches if results weren't satisfactory
2. **Improved Accuracy:** Ignored books won't be suggested again
3. **Transparency:** Users can see their search history
4. **Flexibility:** Optional reason field helps track why books were ignored
5. **Efficiency:** Reuses existing subscription infrastructure

## Technical Notes

- The `user_ignored_books` table uses a composite unique index to prevent duplicate ignore records
- The subscription's `created_at` is reset when reactivated to restart the 1-year expiration timer
- The service layer filters ignored books before creating notifications, ensuring they're never suggested again
- All database operations are wrapped in try-catch blocks for error handling
- The feature is backward compatible - existing subscriptions continue to work as before