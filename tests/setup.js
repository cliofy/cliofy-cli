/**
 * Global test setup and configuration
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeEach(() => {
  // Suppress console output in tests unless needed
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
  }
});

afterEach(() => {
  // Restore console after each test
  if (!process.env.DEBUG_TESTS) {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
  }
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Create a temporary directory for tests
   */
  createTempDir: () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cliofy-test-'));
    return tempDir;
  },
  
  /**
   * Clean up temporary directory
   */
  cleanupTempDir: (dir) => {
    const fs = require('fs');
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
};

// Environment setup
process.env.NODE_ENV = 'test';
process.env.NO_COLOR = '1';
process.env.FORCE_COLOR = '0';