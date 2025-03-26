// jest.setup.js
// Setup file for Jest

require("@testing-library/jest-dom");

// Setup mock for localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(() => null),
    removeItem: jest.fn(() => null),
    clear: jest.fn(() => null),
  },
  writable: true,
});

// Mock fetch globally
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Don't mock these globally - let individual tests handle their own mocking
// jest.mock("@/store/useAuthStore", () => ({...}));
// jest.mock("next/navigation", () => ({...}));
