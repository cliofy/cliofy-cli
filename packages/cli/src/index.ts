#!/usr/bin/env node

/**
 * Cliofy CLI entry point
 * Modern command-line interface for task management with infinite hierarchical nesting
 */

import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { createCoreContext, CoreContext, AuthenticationError } from '@cliofy/core';

import { App } from './components/App';
import { AuthCommand } from './commands/auth';
import { TaskCommand } from './commands/task';
import { HealthCommand } from './commands/health';

/**
 * Global core context
 */
let coreContext: CoreContext;

/**
 * Initialize core context
 */
function initializeCoreContext(): CoreContext {
  if (!coreContext) {
    coreContext = createCoreContext();
  }
  return coreContext;
}

/**
 * Check if user is authenticated for protected commands
 */
function requireAuth(context: CoreContext): void {
  if (!context.authManager.isAuthenticated()) {
    console.error(chalk.red('❌ Authentication required. Please run \'cliofy auth login\' first.'));
    process.exit(1);
  }
}

/**
 * Handle global errors
 */
function handleError(error: Error): void {
  if (error instanceof AuthenticationError) {
    console.error(chalk.red(`❌ Authentication Error: ${error.message}`));
    console.error(chalk.yellow('💡 Try running \'cliofy auth login\' to authenticate.'));
    process.exit(1);
  } else {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Display version information
 */
function showVersion(): void {
  const packageJson = require('../package.json');
  console.log(`cliofy CLI v${packageJson.version}`);
  process.exit(0);
}

/**
 * Main CLI setup
 */
async function main(): Promise<void> {
  try {
    const context = initializeCoreContext();

    const argv = await yargs(hideBin(process.argv))
      .scriptName('cliofy')
      .usage('$0 <command> [options]')
      .help('help')
      .alias('help', 'h')
      .version(false) // Disable default version handling
      .option('version', {
        alias: 'v',
        type: 'boolean',
        description: 'Show version information',
      })
      .option('endpoint', {
        type: 'string',
        description: 'API endpoint URL',
        default: 'http://localhost:5173',
      })
      .option('timeout', {
        type: 'number',
        description: 'Request timeout in milliseconds',
        default: 30000,
      })
      .option('json', {
        type: 'boolean',
        description: 'Output in JSON format',
        default: false,
      })
      .command(
        'auth <subcommand>',
        'Authentication commands',
        (yargs) => {
          return yargs
            .command('login', 'Log in to your Cliofy account', {}, async (argv) => {
              render(React.createElement(AuthCommand, { 
                subcommand: 'login', 
                context,
                args: argv 
              }));
            })
            .command('register', 'Register a new Cliofy account', {}, async (argv) => {
              render(React.createElement(AuthCommand, { 
                subcommand: 'register', 
                context,
                args: argv 
              }));
            })
            .command('logout', 'Log out of your Cliofy account', {}, async (argv) => {
              render(React.createElement(AuthCommand, { 
                subcommand: 'logout', 
                context,
                args: argv 
              }));
            })
            .command('status', 'Show authentication status', {}, async (argv) => {
              render(React.createElement(AuthCommand, { 
                subcommand: 'status', 
                context,
                args: argv 
              }));
            })
            .command('verify', 'Verify authentication token', {}, async (argv) => {
              render(React.createElement(AuthCommand, { 
                subcommand: 'verify', 
                context,
                args: argv 
              }));
            })
            .command('whoami', 'Show current user information', {}, async (argv) => {
              render(React.createElement(AuthCommand, { 
                subcommand: 'whoami', 
                context,
                args: argv 
              }));
            })
            .demandCommand(1, 'Please specify an auth subcommand');
        }
      )
      .command(
        'task <subcommand>',
        'Task management commands',
        (yargs) => {
          return yargs
            .command('list', 'List tasks', {
              parent: { type: 'string', alias: 'p', description: 'Filter by parent task ID' },
              completed: { type: 'string', alias: 'c', description: 'Filter by completion status (true/false)' },
              focused: { type: 'boolean', description: 'Show only focused tasks' },
              archived: { type: 'boolean', description: 'Show only archived tasks' },
              priority: { type: 'number', description: 'Filter by priority level (1-5)' },
              'high-priority': { type: 'boolean', description: 'Show only high priority tasks (4-5)' },
              tags: { type: 'string', description: 'Filter by tags (comma-separated)' },
              view: { type: 'string', description: 'Use predefined view (all|focused|completed|today|overdue|high_priority|archived)' },
              limit: { type: 'number', alias: 'l', description: 'Limit number of results' },
              offset: { type: 'number', alias: 'o', description: 'Skip number of results' },
              output: { type: 'string', alias: 'f', choices: ['table', 'json', 'tree'], default: 'table', description: 'Output format' },
              details: { type: 'boolean', alias: 'd', description: 'Show detailed information' },
            }, async (argv) => {
              requireAuth(context);
              render(React.createElement(TaskCommand, { 
                subcommand: 'list', 
                context,
                args: argv 
              }));
            })
            .command('create <title>', 'Create a new task', {
              parent: { type: 'string', alias: 'p', description: 'Parent task ID' },
              position: { type: 'number', description: 'Position within parent' },
              content: { type: 'string', alias: 'c', description: 'Task content/description' },
              'start-time': { type: 'string', alias: 's', description: 'Start time (ISO format)' },
              'due-time': { type: 'string', alias: 'd', description: 'Due time (ISO format)' },
              output: { type: 'string', alias: 'f', choices: ['table', 'json'], default: 'table', description: 'Output format' },
            }, async (argv) => {
              requireAuth(context);
              render(React.createElement(TaskCommand, { 
                subcommand: 'create', 
                context,
                args: argv 
              }));
            })
            .command('show <taskId>', 'Show detailed information about a task', {
              output: { type: 'string', alias: 'f', choices: ['table', 'json'], default: 'table', description: 'Output format' },
            }, async (argv) => {
              requireAuth(context);
              render(React.createElement(TaskCommand, { 
                subcommand: 'show', 
                context,
                args: argv 
              }));
            })
            .command('update <taskId>', 'Update an existing task', {
              title: { type: 'string', alias: 't', description: 'New title' },
              content: { type: 'string', alias: 'c', description: 'New content' },
              completed: { type: 'string', description: 'Mark as completed/incomplete (true/false)' },
              parent: { type: 'string', alias: 'p', description: 'New parent task ID' },
              position: { type: 'number', description: 'New position' },
              'start-time': { type: 'string', alias: 's', description: 'Start time (ISO format)' },
              'due-time': { type: 'string', alias: 'd', description: 'Due time (ISO format)' },
              output: { type: 'string', alias: 'f', choices: ['table', 'json'], default: 'table', description: 'Output format' },
            }, async (argv) => {
              requireAuth(context);
              render(React.createElement(TaskCommand, { 
                subcommand: 'update', 
                context,
                args: argv 
              }));
            })
            .command('delete <taskId>', 'Delete a task and its children', {
              force: { type: 'boolean', alias: 'f', description: 'Skip confirmation prompt' },
            }, async (argv) => {
              requireAuth(context);
              render(React.createElement(TaskCommand, { 
                subcommand: 'delete', 
                context,
                args: argv 
              }));
            })
            .command('complete <taskId>', 'Mark task as completed', {
              recursive: { type: 'boolean', alias: 'r', description: 'Also complete all children' },
            }, async (argv) => {
              requireAuth(context);
              render(React.createElement(TaskCommand, { 
                subcommand: 'complete', 
                context,
                args: argv 
              }));
            })
            .command('tree', 'Display tasks as hierarchical tree', {
              root: { type: 'string', alias: 'r', description: 'Root task ID' },
              depth: { type: 'number', alias: 'd', description: 'Maximum depth to display' },
            }, async (argv) => {
              requireAuth(context);
              render(React.createElement(TaskCommand, { 
                subcommand: 'tree', 
                context,
                args: argv 
              }));
            })
            .demandCommand(1, 'Please specify a task subcommand');
        }
      )
      .command(
        'health',
        'Check system health',
        {},
        async (argv) => {
          render(React.createElement(HealthCommand, { 
            context,
            args: argv 
          }));
        }
      )
      .middleware((argv) => {
        // Update config with global options
        if (argv.endpoint) {
          context.configManager.updateConfig({ endpoint: argv.endpoint as string });
        }
        if (argv.timeout) {
          context.configManager.updateConfig({ timeout: argv.timeout as number });
        }
      })
      .demandCommand(1, 'Please specify a command')
      .strict()
      .parse();

    // Handle version flag
    if (argv.version) {
      showVersion();
    }

  } catch (error) {
    handleError(error as Error);
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(handleError);
}