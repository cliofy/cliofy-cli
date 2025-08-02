# Testing Guide for Cliofy CLI

This document provides comprehensive guidance on testing the Cliofy CLI project, including setup, writing tests, running tests, and best practices.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

## Testing Strategy

Our testing strategy follows the test pyramid approach with three levels:

### 1. Unit Tests (Fast, Isolated)
- **Purpose**: Test individual functions, classes, and modules in isolation
- **Location**: `tests/unit/`
- **Characteristics**: Fast execution, mocked dependencies, high coverage
- **Examples**: ConfigManager, APIClient, TaskHelpers

### 2. Integration Tests (Medium Speed, Real Dependencies)
- **Purpose**: Test interaction between multiple components
- **Location**: `tests/integration/`
- **Characteristics**: Real HTTP requests (mocked), file system operations
- **Examples**: API client with real axios, auth workflow integration

### 3. End-to-End Tests (Slow, Full System)
- **Purpose**: Test complete user workflows with real CLI execution
- **Location**: `tests/e2e/`
- **Characteristics**: Spawns actual CLI processes, requires running server
- **Examples**: Full auth workflow, task CRUD operations

## Test Structure

```
cliofy-cli/
├── tests/
│   ├── unit/                 # Unit tests
│   │   ├── config.test.ts
│   │   ├── apiClient.test.ts
│   │   ├── authManager.test.ts
│   │   └── taskHelpers.test.ts
│   ├── integration/          # Integration tests
│   │   └── apiIntegration.test.ts
│   ├── e2e/                  # End-to-end tests
│   │   └── cliWorkflow.test.ts
│   ├── fixtures/             # Test data
│   │   └── testData.ts
│   ├── mocks/                # Mock implementations
│   │   └── apiMocks.ts
│   └── setup.js              # Global test setup
├── jest.config.js            # Jest configuration
├── scripts/
│   └── test-runner.js        # Custom test runner
└── .github/workflows/
    └── ci.yml                # CI configuration
```

## Running Tests

### Quick Commands

```bash
# Run all tests
pnpm test

# Run specific test types  
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests only
pnpm test:e2e        # E2E tests only (requires dev server)

# Development workflow
pnpm test:watch      # Watch mode for active development
pnpm test:coverage   # Generate coverage report

# Full CI pipeline
pnpm preflight       # Lint + format + build + all tests
```

### Custom Test Runner

Use our custom test runner for more control:

```bash
# Basic commands
node scripts/test-runner.js unit
node scripts/test-runner.js integration  
node scripts/test-runner.js e2e
node scripts/test-runner.js all

# Development commands
node scripts/test-runner.js lint
node scripts/test-runner.js format
node scripts/test-runner.js build

# CI pipeline
node scripts/test-runner.js ci
```

### E2E Test Requirements

E2E tests require the development server to be running:

```bash
# Terminal 1: Start the development server
cd ../.. # Go to main project root
pnpm dev

# Terminal 2: Run E2E tests  
cd cliofy-cli
pnpm test:e2e
```

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/configManager.test.ts
describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let tempConfigDir: string;

  beforeEach(() => {
    tempConfigDir = global.testUtils.createTempDir();
    configManager = new ConfigManager(tempConfigDir);
  });

  afterEach(() => {
    global.testUtils.cleanupTempDir(tempConfigDir);
  });

  it('should load default config when no file exists', () => {
    const config = configManager.loadConfig();
    
    expect(config).toEqual(DEFAULT_CONFIG);
  });
});
```

### Integration Test Example

```typescript
// tests/integration/apiIntegration.test.ts
describe('Authentication Flow Integration', () => {
  let mockApi: MockAdapter;

  beforeEach(() => {
    mockApi = createApiMock();
    setupCommonApiMocks(mockApi);
  });

  afterEach(() => {
    mockApi.restore();
  });

  it('should complete full login workflow', async () => {
    const loginResult = await authManager.login('test@example.com', 'password123');
    
    expect(loginResult.success).toBe(true);
    expect(configManager.isAuthenticated()).toBe(true);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/cliWorkflow.test.ts
describe('CLI E2E Tests', () => {
  const runCLI = (args: string[]) => {
    return new Promise((resolve) => {
      const child = spawn('node', ['test-cli.js', ...args]);
      // ... handle process execution
    });
  };

  it('should complete authentication workflow', async () => {
    const result = await runCLI(['auth', 'login', 'test@example.com', 'password123']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Successfully logged in');
  });
});
```

## Best Practices

### 1. Test Organization

- **Group related tests**: Use `describe` blocks to group related functionality
- **Clear test names**: Use descriptive names that explain what is being tested
- **Setup and teardown**: Use `beforeEach`/`afterEach` for consistent test state

### 2. Mocking Strategy

- **Unit tests**: Mock all external dependencies
- **Integration tests**: Mock only external services (HTTP requests)
- **E2E tests**: Use real implementations

### 3. Test Data Management

- Use fixtures for consistent test data: `import { mockTasks } from '../fixtures/testData'`
- Generate unique data for tests that modify state
- Clean up test data in `afterEach` hooks

### 4. Assertions

```typescript
// Good: Specific assertions
expect(result.success).toBe(true);
expect(result.user.email).toBe('test@example.com');

// Avoid: Generic assertions
expect(result).toBeTruthy();
```

### 5. Error Testing

```typescript
it('should handle network errors', async () => {
  mockApiClient.login.mockRejectedValue(new Error('Network error'));
  
  const result = await authManager.login('test@example.com', 'password');
  
  expect(result.success).toBe(false);
  expect(result.message).toContain('Network error');
});
```

### 6. Async Testing

```typescript
// Use async/await for async operations
it('should fetch tasks successfully', async () => {
  const tasks = await apiClient.getTasks();
  expect(tasks).toHaveLength(2);
});

// Handle rejections properly
it('should handle API errors', async () => {
  await expect(apiClient.getTasks()).rejects.toThrow('Unauthorized');
});
```

## Continuous Integration

Our CI pipeline runs on GitHub Actions and includes:

### 1. Code Quality Checks
- TypeScript compilation
- ESLint linting
- Prettier formatting
- Security audit

### 2. Test Execution
- Unit tests on Node.js 18.x and 20.x
- Integration tests with mocked APIs
- E2E tests with real server (when available)

### 3. Coverage Reporting
- Coverage reports uploaded to Codecov
- Minimum coverage thresholds enforced

### 4. Multi-platform Testing
- Tests run on Ubuntu, Windows, and macOS
- Ensures cross-platform compatibility

## Environment Variables

Set these environment variables for testing:

```bash
# E2E testing
TEST_API_ENDPOINT=http://localhost:5173

# Debug mode  
DEBUG_TESTS=true  # Shows console output in tests

# Custom config directory
CLI_CONFIG_DIR=/path/to/temp/config
```

## Coverage Reporting

Coverage reports are generated in multiple formats:

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html

# Coverage thresholds (in jest.config.js)
# - Branches: 70%
# - Functions: 80%  
# - Lines: 80%
# - Statements: 80%
```

## Debugging Tests

### 1. Run Tests in Debug Mode

```bash
# Show console output
DEBUG_TESTS=true pnpm test:unit

# Run specific test file
npx jest tests/unit/configManager.test.ts --verbose

# Run specific test case
npx jest -t "should load default config" --verbose
```

### 2. VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Troubleshooting

### Common Issues

#### 1. E2E Tests Failing
```bash
# Check if server is running
curl http://localhost:5173/api/health-check

# Start server if needed
cd ../.. && pnpm dev
```

#### 2. Module Resolution Errors
```bash
# Clear node modules and reinstall
pnpm clean
pnpm install
```

#### 3. TypeScript Compilation Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Build project first
pnpm build
```

#### 4. Mock Issues
```bash
# Clear Jest cache
npx jest --clearCache

# Check mock implementations in tests/mocks/
```

### Getting Help

1. Check test logs for specific error messages
2. Run tests with `--verbose` flag for detailed output
3. Use `DEBUG_TESTS=true` to see console output
4. Check GitHub Actions logs for CI failures
5. Review this documentation for best practices

---

For more information, see:
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)