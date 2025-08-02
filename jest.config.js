/**
 * Jest configuration for cliofy-cli monorepo
 */

module.exports = {
  // Use TypeScript preset
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.{js,ts}',
    '**/__tests__/**/*.test.{js,ts}'
  ],
  
  // Module paths
  roots: ['<rootDir>/packages', '<rootDir>/tests'],
  
  // Module name mapping for monorepo
  moduleNameMapper: {
    '^@cliofy/core$': '<rootDir>/packages/core/src',
    '^@cliofy/core/(.*)$': '<rootDir>/packages/core/src/$1',
    '^@cliofy/cli$': '<rootDir>/packages/cli/src',
    '^@cliofy/cli/(.*)$': '<rootDir>/packages/cli/src/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'packages/*/src/**/*.{js,ts}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/index.ts',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/*.test.{js,ts}'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout and performance  
  maxWorkers: '50%',
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Global test variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Test runner projects for different test types
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/tests/unit/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      moduleNameMapper: {
        '^@cliofy/core$': '<rootDir>/packages/core/src',
        '^@cliofy/core/(.*)$': '<rootDir>/packages/core/src/$1',
        '^@cliofy/cli$': '<rootDir>/packages/cli/src',
        '^@cliofy/cli/(.*)$': '<rootDir>/packages/cli/src/$1'
      }
    },
    {
      displayName: 'integration',
      preset: 'ts-jest', 
      testEnvironment: 'node',
      testMatch: ['**/tests/integration/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      moduleNameMapper: {
        '^@cliofy/core$': '<rootDir>/packages/core/src',
        '^@cliofy/core/(.*)$': '<rootDir>/packages/core/src/$1',
        '^@cliofy/cli$': '<rootDir>/packages/cli/src',
        '^@cliofy/cli/(.*)$': '<rootDir>/packages/cli/src/$1'
      }
    },
    {
      displayName: 'e2e',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/tests/e2e/**/*.test.{js,ts}'],
      testTimeout: 60000, // Longer timeout for E2E tests
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      moduleNameMapper: {
        '^@cliofy/core$': '<rootDir>/packages/core/src',
        '^@cliofy/core/(.*)$': '<rootDir>/packages/core/src/$1',
        '^@cliofy/cli$': '<rootDir>/packages/cli/src',
        '^@cliofy/cli/(.*)$': '<rootDir>/packages/cli/src/$1'
      }
    }
  ]
};