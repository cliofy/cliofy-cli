/**
 * Working Jest configuration for cliofy-cli
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test matching
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/integration/**/*.test.ts',
    '**/tests/e2e/**/*.test.ts'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@cliofy/core$': '<rootDir>/packages/core/src',
    '^@cliofy/core/(.*)$': '<rootDir>/packages/core/src/$1',
    '^@cliofy/cli$': '<rootDir>/packages/cli/src',
    '^@cliofy/cli/(.*)$': '<rootDir>/packages/cli/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        target: 'es2020',
        module: 'commonjs'
      }
    }]
  },
  
  // Coverage
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/index.ts'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Timeout
  testTimeout: 30000
};