import { closeDatabase } from '../src/database/db';

// Clean up after all tests
// (Environment variables are set in jest.global-setup.js)
afterAll(async () => {
  await closeDatabase();
});
