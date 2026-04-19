"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest setup file for unit tests
const globals_1 = require("@jest/globals");
// Extend Jest matchers
expect.extend({
    toBeWithinRange(received, floor, ceiling) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
});
// Global test timeout
globals_1.jest.setTimeout(30000);
// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeAll(() => {
    console.error = globals_1.jest.fn();
    console.warn = globals_1.jest.fn();
});
afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});
// Global test setup
beforeEach(() => {
    // Clear all mocks before each test
    globals_1.jest.clearAllMocks();
});
// Global test teardown
afterEach(() => {
    // Cleanup after each test
    globals_1.jest.restoreAllMocks();
});
// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.TEST_TIMEOUT = '30000';
// Global test utilities
global.testUtils = {
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    generateRandomString: (length) => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    },
    generateRandomEmail: () => {
        const randomString = global.testUtils.generateRandomString(8);
        return `test.${randomString}@example.com`;
    },
};
//# sourceMappingURL=jest.setup.js.map