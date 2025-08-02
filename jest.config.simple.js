/**
 * Simplified Jest configuration for debugging
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Basic test matching
  testMatch: [
    '**/tests/**/*.test.ts'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@cliofy/core$': '<rootDir>/packages/core/src',
    '^@cliofy/core/(.*)$': '<rootDir>/packages/core/src/$1',
    '^@cliofy/cli$': '<rootDir>/packages/cli/src',
    '^@cliofy/cli/(.*)$': '<rootDir>/packages/cli/src/$1'
  },
  
  // Coverage
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts'
  ],
  
  // Timeout
  testTimeout: 30000,
  
  // Transform
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  }
};