// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Suppress console.error during tests by default.
// Run  `npm run test:error`  to see them.
const originalError = console.error;
beforeAll(() => {
  if (!process.env.SHOW_CONSOLE_ERRORS) {
    console.error = () => {};
  }
});
afterAll(() => {
  console.error = originalError;
});
