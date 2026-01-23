/**
 * Jest setup file
 * Runs before all tests
 */

// Increase timeout for slow tests
jest.setTimeout(60000);

// Add delay between test suites to avoid rate limiting
beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
});

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Global test timeout
jest.setTimeout(60000);
