# Testing Guide

## Overview

This project uses **Jest** as the testing framework with **Supertest** for API integration testing. Tests are written in TypeScript and use an in-memory SQLite database to ensure fast, isolated test execution.

## Test Structure

```
tests/
├── setup.ts                          # Global test setup
├── helpers/
│   └── testDb.ts                     # Database test utilities
├── unit/
│   └── database.test.ts              # Unit tests for database operations
└── integration/
    ├── api.test.ts                   # API endpoint integration tests
    └── finishedSearches.test.ts      # Feature-specific integration tests
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Only Unit Tests
```bash
npm run test:unit
```

### Run Only Integration Tests
```bash
npm run test:integration
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- **Test Environment**: Node.js
- **Test Timeout**: 10 seconds
- **Coverage Directory**: `./coverage`
- **Test Match Patterns**: `**/*.test.ts`, `**/*.spec.ts`
- **Setup File**: `tests/setup.ts`

### Test Database

Tests use an **in-memory SQLite database** (`:memory:`), which:
- Provides fast test execution
- Ensures complete isolation between test runs
- Automatically cleans up after tests complete
- Doesn't require external database setup

## Test Utilities

### Database Helpers (`tests/helpers/testDb.ts`)

Utility functions for creating test data:

```typescript
// Initialize test database
await setupTestDatabase();

// Clear all data
await clearTestDatabase();

// Create test entities
const userId = await createTestUser('test@example.com');
const authorId = await createTestAuthor('John Doe');
const bookId = await createTestBook('Test Book', authorId);
const libraryId = await createTestLibrary('Test Library', 'test-lib');

// Create subscriptions
const subId = await createBookSubscription(userId, bookId, 'active');
await createUserLibrarySubscription(userId, libraryId);

// Add ignored books
await addIgnoredBook(userId, bookId, subId, 'wrong_book');
```

## Test Categories

### Unit Tests

**Location**: `tests/unit/`

Test individual components in isolation:
- Database operations (CRUD)
- Data validation
- Foreign key constraints
- Unique constraints

**Example**:
```typescript
describe('User Operations', () => {
  it('should create a user', async () => {
    const userId = await createTestUser('user@test.com');
    expect(userId).toBeGreaterThan(0);
  });
});
```

### Integration Tests

**Location**: `tests/integration/`

Test complete workflows and API endpoints:
- API request/response handling
- Multi-step workflows
- Feature interactions
- Error handling

**Example**:
```typescript
describe('POST /books/:id/reactivate', () => {
  it('should reactivate a completed subscription', async () => {
    const response = await request(app)
      .post(`/books/${bookId}/reactivate`)
      .send({ user_id: userId, reason: 'wrong_book' })
      .expect(200);
  });
});
```

## Test Coverage

### Current Coverage Areas

✅ **Database Operations**
- User CRUD operations
- Author management
- Book management
- Library management
- Foreign key constraints
- Unique constraints

✅ **Finished Searches Feature**
- Subscription status filtering
- Ignored books management
- Subscription reactivation
- Complete reactivation workflow
- Multi-user scenarios

✅ **API Endpoints**
- GET /users/:id/book-subscriptions
- POST /books/:id/subscribe
- POST /books/:id/reactivate
- DELETE /books/:id/subscribe
- Error handling
- Input validation

### Viewing Coverage Reports

After running `npm run test:coverage`, open:
```
coverage/lcov-report/index.html
```

This provides a detailed HTML report showing:
- Line coverage
- Branch coverage
- Function coverage
- Uncovered lines

## Writing New Tests

### Best Practices

1. **Use Descriptive Test Names**
   ```typescript
   it('should filter subscriptions by status=completed', async () => {
     // Test implementation
   });
   ```

2. **Follow AAA Pattern** (Arrange, Act, Assert)
   ```typescript
   it('should create a user', async () => {
     // Arrange
     const email = 'test@example.com';
     
     // Act
     const userId = await createTestUser(email);
     
     // Assert
     expect(userId).toBeGreaterThan(0);
   });
   ```

3. **Clean Up Between Tests**
   ```typescript
   beforeEach(async () => {
     await clearTestDatabase();
   });
   ```

4. **Test Edge Cases**
   - Invalid inputs
   - Missing required fields
   - Duplicate entries
   - Non-existent resources

5. **Use Test Helpers**
   - Leverage `tests/helpers/testDb.ts` for common operations
   - Keep tests DRY (Don't Repeat Yourself)

### Example Test Template

```typescript
import { setupTestDatabase, clearTestDatabase } from '../helpers/testDb';

describe('Feature Name', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      // ... setup test data
      
      // Act
      // ... perform action
      
      // Assert
      // ... verify results
    });
  });
});
```

## Continuous Integration

### GitHub Actions (Recommended)

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### Tests Timing Out

If tests timeout, increase the timeout in `jest.config.js`:
```javascript
testTimeout: 20000, // 20 seconds
```

### Database Lock Errors

Ensure `clearTestDatabase()` is called in `beforeEach`:
```typescript
beforeEach(async () => {
  await clearTestDatabase();
});
```

### Import Errors

Verify TypeScript paths are correctly configured in `tsconfig.json` and `jest.config.js`.

### Memory Issues

For large test suites, consider:
- Running tests in parallel: `jest --maxWorkers=4`
- Splitting tests into smaller files
- Using `--runInBand` for sequential execution

## Future Improvements

- [ ] Add E2E tests with real database
- [ ] Add performance/load tests
- [ ] Add mutation testing
- [ ] Increase coverage to 90%+
- [ ] Add visual regression tests (if applicable)
- [ ] Add contract tests for external APIs

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)