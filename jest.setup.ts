// Jest setup: silence console outputs during tests to avoid noisy logs and
// "Cannot log after tests are done" warnings from late async console calls.

// Ensure test environment variable
process.env.NODE_ENV = 'test';

// Stub console methods
const noop = () => {};

// Use jest.fn() so calls can be asserted if needed
// and to avoid writing to the BufferedConsole after tests complete
// eslint-disable-next-line @typescript-eslint/no-empty-function
console.log = jest.fn(noop);
// eslint-disable-next-line @typescript-eslint/no-empty-function
console.warn = jest.fn(noop);
// eslint-disable-next-line @typescript-eslint/no-empty-function
console.error = jest.fn(noop);

export {};
