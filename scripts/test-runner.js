#!/usr/bin/env node

/**
 * Test runner script for cliofy-cli
 * Provides convenient commands for running different types of tests
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🔄${colors.reset} ${msg}`),
  result: (msg) => console.log(`${colors.magenta}📊${colors.reset} ${msg}`)
};

/**
 * Run a command and return success status
 */
function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    log.step(`Running: ${cmd} ${args.join(' ')}`);
    
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    child.on('error', (error) => {
      log.error(`Command failed: ${error.message}`);
      resolve(false);
    });
  });
}

/**
 * Check if development server is running
 */
async function checkDevServer() {
  try {
    const { default: axios } = await import('axios');
    const endpoint = process.env.CLIOFY_ENDPOINT || process.env.TEST_API_ENDPOINT || 'http://localhost:5173';
    await axios.get(`${endpoint}/api/health-check`, { timeout: 3000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Install dependencies
 */
async function installDependencies() {
  log.step('Installing dependencies...');
  
  // Check if pnpm is available
  try {
    await runCommand('pnpm', ['--version'], { stdio: 'pipe' });
  } catch (error) {
    log.error('pnpm is not installed. Please install pnpm first.');
    return false;
  }

  return await runCommand('pnpm', ['install']);
}

/**
 * Run unit tests
 */
async function runUnitTests() {
  log.step('Running unit tests...');
  return await runCommand('npx', ['jest', '--selectProjects', 'unit', '--verbose']);
}

/**
 * Run integration tests
 */
async function runIntegrationTests() {
  log.step('Running integration tests...');
  return await runCommand('npx', ['jest', '--selectProjects', 'integration', '--verbose']);
}

/**
 * Run E2E tests
 */
async function runE2ETests() {
  log.step('Checking if development server is running...');
  const endpoint = process.env.CLIOFY_ENDPOINT || process.env.TEST_API_ENDPOINT || 'http://localhost:5173';
  const serverRunning = await checkDevServer();
  
  if (!serverRunning) {
    log.warning(`Development server is not running at ${endpoint}`);
    log.info('Please start the server with: pnpm dev');
    log.info('Or set TEST_API_ENDPOINT environment variable to point to your server');
    log.info('Skipping E2E tests...');
    return true; // Don't fail the build for missing server
  }

  log.step('Running E2E tests...');
  return await runCommand('npx', ['jest', '--selectProjects', 'e2e', '--verbose', '--runInBand']);
}

/**
 * Run all tests with coverage
 */
async function runAllTests() {
  log.step('Running all tests with coverage...');
  return await runCommand('npx', ['jest', '--coverage', '--verbose']);
}

/**
 * Run linting
 */
async function runLinting() {
  log.step('Running TypeScript type checking...');
  const tscSuccess = await runCommand('npx', ['tsc', '--noEmit']);
  
  log.step('Running ESLint...');
  const eslintSuccess = await runCommand('npx', ['eslint', 'packages/*/src/**/*.ts', 'tests/**/*.ts']);
  
  return tscSuccess && eslintSuccess;
}

/**
 * Run formatting check
 */
async function runFormatCheck() {
  log.step('Checking code formatting...');
  return await runCommand('npx', ['prettier', '--check', 'packages/*/src/**/*.ts', 'tests/**/*.ts']);
}

/**
 * Format code
 */
async function formatCode() {
  log.step('Formatting code...');
  return await runCommand('npx', ['prettier', '--write', 'packages/*/src/**/*.ts', 'tests/**/*.ts']);
}

/**
 * Build project
 */
async function buildProject() {
  log.step('Building project...');
  return await runCommand('pnpm', ['build']);
}

/**
 * Clean build artifacts
 */
async function cleanProject() {
  log.step('Cleaning build artifacts...');
  return await runCommand('pnpm', ['clean']);
}

/**
 * Run CI pipeline
 */
async function runCIPipeline() {
  log.info('🚀 Starting CI Pipeline...');
  console.log('=' * 50);
  
  const steps = [
    { name: 'Install Dependencies', fn: installDependencies },
    { name: 'Lint Code', fn: runLinting },
    { name: 'Check Formatting', fn: runFormatCheck },
    { name: 'Build Project', fn: buildProject },
    { name: 'Run Unit Tests', fn: runUnitTests },
    { name: 'Run Integration Tests', fn: runIntegrationTests },
    { name: 'Run E2E Tests', fn: runE2ETests }
  ];
  
  let success = true;
  
  for (const step of steps) {
    log.info(`\n📋 ${step.name}...`);
    const stepSuccess = await step.fn();
    
    if (stepSuccess) {
      log.success(`${step.name} completed successfully`);
    } else {
      log.error(`${step.name} failed`);
      success = false;
      break;
    }
  }
  
  console.log('\n' + '=' * 50);
  if (success) {
    log.success('🎉 CI Pipeline completed successfully!');
  } else {
    log.error('💥 CI Pipeline failed!');
  }
  
  return success;
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
${colors.cyan}Cliofy CLI Test Runner${colors.reset}

Usage: node scripts/test-runner.js <command>

Commands:
  ${colors.green}install${colors.reset}      Install dependencies
  ${colors.green}unit${colors.reset}         Run unit tests only
  ${colors.green}integration${colors.reset}  Run integration tests only  
  ${colors.green}e2e${colors.reset}          Run E2E tests only (requires dev server)
  ${colors.green}all${colors.reset}          Run all tests with coverage
  ${colors.green}lint${colors.reset}         Run linting (TypeScript + ESLint)
  ${colors.green}format${colors.reset}       Format code with Prettier
  ${colors.green}format-check${colors.reset} Check code formatting
  ${colors.green}build${colors.reset}        Build the project
  ${colors.green}clean${colors.reset}        Clean build artifacts
  ${colors.green}ci${colors.reset}           Run complete CI pipeline

Examples:
  node scripts/test-runner.js unit
  node scripts/test-runner.js e2e
  node scripts/test-runner.js ci

Notes:
  - E2E tests require the development server running at http://localhost:5173
  - Start the server with: pnpm dev
  - Use 'ci' command for complete validation before commits
`);
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    showUsage();
    process.exit(1);
  }
  
  let success = false;
  
  switch (command) {
    case 'install':
      success = await installDependencies();
      break;
    case 'unit':
      success = await runUnitTests();
      break;
    case 'integration':
      success = await runIntegrationTests();
      break;
    case 'e2e':
      success = await runE2ETests();
      break;
    case 'all':
      success = await runAllTests();
      break;
    case 'lint':
      success = await runLinting();
      break;
    case 'format':
      success = await formatCode();
      break;
    case 'format-check':
      success = await runFormatCheck();
      break;
    case 'build':
      success = await buildProject();
      break;
    case 'clean':
      success = await cleanProject();
      break;
    case 'ci':
      success = await runCIPipeline();
      break;
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      process.exit(0);
      break;
    default:
      log.error(`Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
  
  if (success) {
    log.success('Command completed successfully');
    process.exit(0);
  } else {
    log.error('Command failed');
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});