#!/usr/bin/env tsx

/**
 * Development script for running the CLI in development mode
 */

import { spawn } from 'child_process';
import path from 'path';
import chalk from 'chalk';

const ROOT_DIR = path.resolve(__dirname, '..');
const CORE_DIR = path.join(ROOT_DIR, 'packages', 'core');
const CLI_DIR = path.join(ROOT_DIR, 'packages', 'cli');

async function startDev(): Promise<void> {
  console.log(chalk.blue('🚀 Starting Cliofy CLI development environment...\n'));

  // Start core package in watch mode
  const coreProcess = spawn('pnpm', ['run', 'dev'], {
    cwd: CORE_DIR,
    stdio: 'pipe',
  });

  coreProcess.stdout?.on('data', (data) => {
    console.log(chalk.cyan('[core]'), data.toString().trim());
  });

  coreProcess.stderr?.on('data', (data) => {
    console.error(chalk.red('[core error]'), data.toString().trim());
  });

  // Start CLI package in watch mode
  const cliProcess = spawn('pnpm', ['run', 'dev'], {
    cwd: CLI_DIR,
    stdio: 'pipe',
  });

  cliProcess.stdout?.on('data', (data) => {
    console.log(chalk.green('[cli]'), data.toString().trim());
  });

  cliProcess.stderr?.on('data', (data) => {
    console.error(chalk.red('[cli error]'), data.toString().trim());
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⏹️  Stopping development servers...'));
    coreProcess.kill();
    cliProcess.kill();
    process.exit(0);
  });

  // Wait for processes to exit
  await Promise.all([
    new Promise((resolve) => coreProcess.on('exit', resolve)),
    new Promise((resolve) => cliProcess.on('exit', resolve)),
  ]);
}

if (require.main === module) {
  startDev().catch((error) => {
    console.error(chalk.red('❌ Failed to start development environment:'), error);
    process.exit(1);
  });
}