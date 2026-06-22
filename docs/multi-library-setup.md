# Multi-Library Onleihe Support Setup Guide

This guide explains how to set up and use the multi-library Onleihe support feature in the Book Notification Backend.

## Important: Onleihe v3 API Only

**This application only supports Onleihe v3 API.** Older versions of the Onleihe API are not compatible. Ensure your library uses the v3 API endpoint structure (`https://api.onleihe.de`).

## Overview

The application now supports multiple Onleihe libraries, allowing users to:
- Subscribe to multiple libraries simultaneously
- Receive notifications when books become available in any of their subscribed libraries
- Manage their library subscriptions independently

## Database Schema

The multi-library feature introduces three new tables:

### `onleihe_libraries`
Stores information about available Onleihe libraries.
- `id`: Primary key
- `name`: Display name of the library (e.g., "Berlin Public Library")
- `onleihe_id`: The Onleihe system ID for the library
- `description`: Optional description
- `created_at`: Timestamp

### `user_onleihe_libraries`
Links users to their subscribed libraries.
- `id`: Primary key
- `user_id`: Foreign key to users table
- `library_id`: Foreign key to onleihe_libraries table
- `created_at`: Timestamp

### `book_onleihe_availability`
Tracks book availability across different libraries.
- `id`: Primary key
- `book_id`: Foreign key to books table
- `library_id`: Foreign key to onleihe_libraries table
- `is_available`: Boolean (0/1) indicating availability
- `checked_at`: Last check timestamp
- `created_at`: Timestamp

## API Endpoints

### Library Management

#### Get all libraries
```http
GET /api/libraries
```

Response:
```json
[
  {
    "id": 1,
    "name": "Berlin Public Library",
    "onleihe_id": "berlin",
    "description": "Berlin's public library system",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
]
```

#### Get a specific library
```http
GET /api/libraries/:id
```

#### Create a new library
```http
POST /api/libraries
Content-Type: application/json

{
  "name": "Munich Public Library",
  "onleihe_id": "muenchen",
  "description": "Munich's public library system"
}
```

#### Update a library
```http
PUT /api/libraries/:id
Content-Type: application/json

{
  "name": "Updated Library Name",
  "description": "Updated description"
}
```

#### Delete a library
```http
DELETE /api/libraries/:id
```

### User Library Subscriptions

#### Get user's library subscriptions
```http
GET /api/users/:userId/library-subscriptions
```

Response:
```json
[
  {
    "subscription_id": 1,
    "subscribed_at": "2026-01-01T00:00:00.000Z",
    "library_id": 1,
    "library_name": "Berlin Public Library",
    "onleihe_id": "berlin",
    "description": "Berlin's public library system"
  }
]
```

#### Subscribe user to a library
```http
POST /api/users/:userId/library-subscriptions
Content-Type: application/json

{
  "library_id": 1
}
```

#### Unsubscribe user from a library
```http
DELETE /api/users/:userId/library-subscriptions/:subscriptionId
```

## Setup Instructions

### 1. Database Migration

The new tables will be created automatically when you start the application. If you have an existing database, the tables will be added without affecting existing data.

**Note:** The old `onleihe_available` and `onleihe_checked_at` fields in the `books` table are kept for backward compatibility but are no longer actively used. The new `book_onleihe_availability` table provides per-library tracking.

### 2. Add Libraries to the System

Before users can subscribe to libraries, you need to add them to the system. You can do this via the API:

```bash
# Example: Add Berlin Public Library
curl -X POST http://localhost:3000/api/libraries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Berlin Public Library",
    "onleihe_id": "berlin",
    "description": "Berlin public library system"
  }'

# Example: Add Munich Public Library
curl -X POST http://localhost:3000/api/libraries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Munich Public Library",
    "onleihe_id": "muenchen",
    "description": "Munich public library system"
  }'
```

### 3. Finding Onleihe Library IDs

To find the correct `onleihe_id` for a library:

1. Visit the library's Onleihe website (e.g., https://www.onleihe.de/berlin)
2. The library ID is typically in the URL or can be found in the network requests
3. Common examples:
   - Berlin: `berlin`
   - Munich: `muenchen`
   - Hamburg: `hamburg`
   - Frankfurt: `frankfurt`

### 4. User Workflow

1. **User creates an account**
   ```bash
   curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com"}'
   ```

2. **User subscribes to libraries**
   ```bash
   # Subscribe to Berlin library (library_id: 1)
   curl -X POST http://localhost:3000/api/users/1/library-subscriptions \
     -H "Content-Type: application/json" \
     -d '{"library_id": 1}'
   
   # Subscribe to Munich library (library_id: 2)
   curl -X POST http://localhost:3000/api/users/1/library-subscriptions \
     -H "Content-Type: application/json" \
     -d '{"library_id": 2}'
   ```

3. **User subscribes to authors or books**
   ```bash
   # Subscribe to an author
   curl -X POST http://localhost:3000/api/authors/1/subscribe \
     -H "Content-Type: application/json" \
     -d '{"user_id": 1}'
   
   # Subscribe to a specific book for Onleihe notifications
   curl -X POST http://localhost:3000/api/books/1/subscribe \
     -H "Content-Type: application/json" \
     -d '{"user_id": 1}'
   ```

## Alternative Search Terms

Sometimes a book's official title doesn't match how it appears in Onleihe. You can provide an **alternative search term** to help the system find the book.

### When to Use Alternative Search Terms

- Book has a different title in Onleihe (e.g., subtitle differences)
- Book is part of a series and needs specific search terms
- Original title vs. translated title differences
- Special characters or formatting differences

### Setting Alternative Search Terms

Update a book's alternative search term via the API:

```bash
curl -X PATCH http://localhost:3000/api/books/1/alternative-search-term \
  -H "Content-Type: application/json" \
  -d '{"alternative_search_term": "Alternative Title"}'
```

To remove an alternative search term:

```bash
curl -X PATCH http://localhost:3000/api/books/1/alternative-search-term \
  -H "Content-Type: application/json" \
  -d '{"alternative_search_term": null}'
```

### How It Works

- If an alternative search term is set, the system uses it **instead of** the official title when searching Onleihe
- The official title is still displayed to users in the UI
- This is optional - most books work fine with their official title

## How It Works

### Availability Checking

The Onleihe check cron job runs periodically with the following optimized strategy:

1. **Fetches all books** that have active user subscriptions
2. **For each book:**
   - Identifies all users subscribed to that book and their library access
   - Checks if users have already been notified (skips book if all users notified)
   - Only checks libraries that users actually have access to
   - **Reuses existing availability data** - if a book was already found available in a library, no API call is made
   - **Stops checking** once all users have been notified via their accessible libraries
3. **Updates** the `book_onleihe_availability` table with results
4. **Creates notifications** for users who are subscribed to both the book and the library where it became available

### Performance Optimizations

The system is optimized to minimize API calls and execution time:

- **Single check per book/library combination**: Each book is checked in each library only once per run, with results shared across all users
- **Skip already available books**: If a book was previously found available in a library, that data is reused without making a new API call
- **Early termination**: Stops checking a book once all subscribed users have been notified via their accessible libraries
- **Relevant libraries only**: Only checks libraries that at least one user has access to
- **1-year expiration**: Books that have been subscribed to for over 1 year without becoming available are automatically excluded from checks (unlikely to become available)

**Example:** If 10 users are subscribed to the same book, and it's available in Berlin library (which all 10 users have access to), the system:
1. Makes 1 API call to check Berlin
2. Notifies all 10 users
3. Skips checking other libraries since all users are satisfied

### Subscription Expiration Policy

**Books are only checked for 1 year after the first subscription.**

- If a book doesn't become available within 1 year of the oldest subscription, it's automatically excluded from future checks
- This is based on the assumption that if a book hasn't appeared in Onleihe within a year, it's unlikely to appear later
- Users can re-subscribe to a book if they want to restart the checking period
- This significantly reduces API load for books that are unlikely to ever be available

**Example Timeline:**
- Day 1: User subscribes to "Book X"
- Days 1-365: System checks for availability
- Day 366+: System stops checking (subscription expired)
- If user re-subscribes: Checking resumes for another year

### Notification Logic

A user receives an Onleihe availability notification when:
1. They have subscribed to a specific book
2. They have subscribed to at least one library
3. The book becomes available in one of their subscribed libraries
4. They haven't already been notified about this book

**Important:** Users are only notified once per book, on the first day it becomes available in any of their libraries. This ensures users get timely notifications without being spammed.

### Example Scenario

**Setup:**
- User Alice subscribes to Berlin and Munich libraries
- User Bob subscribes to only Berlin library
- Both subscribe to notifications for "New Book by Author X"

**When the book becomes available:**
- In Berlin library: Both Alice and Bob receive notifications
- In Munich library: Only Alice receives a notification

## Testing

### Manual Trigger

You can manually trigger an Onleihe availability check:

```bash
curl -X POST http://localhost:3000/api/check-onleihe
```

### Check Library Subscriptions

```bash
# Get all libraries
curl http://localhost:3000/api/libraries

# Get user's library subscriptions
curl http://localhost:3000/api/users/1/library-subscriptions

# Get user's book subscriptions
curl http://localhost:3000/api/users/1/book-subscriptions
```

## Migration from Single Library

If you were previously using the single `ONLEIHE_ID` environment variable:

1. Remove `ONLEIHE_ID` from your `.env` file (it's no longer used)
2. Add your library via the API as shown above
3. Have users subscribe to the library
4. The system will automatically start checking all registered libraries

## Common Onleihe Library IDs

Here are some common German library Onleihe IDs:

| Library | Onleihe ID |
|---------|------------|
| Berlin | `berlin` |
| Munich | `muenchen` |
| Hamburg | `hamburg` |
| Frankfurt | `frankfurt` |
| Cologne | `koeln` |
| Stuttgart | `stuttgart` |
| Dresden | `dresden` |
| Leipzig | `leipzig` |
| Hannover | `hannover` |
| Nuremberg | `nuernberg` |

## Troubleshooting

### Library not found during check
- Verify the `onleihe_id` is correct
- Check the Onleihe API is accessible
- Review server logs for authentication errors

### No notifications received
- Ensure user is subscribed to both the book AND at least one library
- Check that the book is actually available in the subscribed library
- Verify email configuration is correct
- Check notification status in database

### Performance considerations
- The system checks all books against all libraries
- With many books and libraries, this can take time
- Consider adjusting cron job frequency based on your needs
- Monitor API rate limits from Onleihe

## Best Practices

1. **Start with popular libraries**: Add the most commonly used libraries first
2. **Clear descriptions**: Provide helpful descriptions for each library
3. **User guidance**: Help users find their library's Onleihe ID
4. **Monitor logs**: Watch for authentication or API errors
5. **Rate limiting**: Be mindful of Onleihe API rate limits

## Future Enhancements

Potential improvements to consider:
- Library search/autocomplete
- Automatic library discovery
- Per-library notification preferences
- Library availability statistics
- Batch library operations
- Library groups/regions

## Support

For issues or questions:
- Check the main TODO.md for known issues
- Review server logs for errors
- Ensure all dependencies are up to date
- Verify database schema is correct