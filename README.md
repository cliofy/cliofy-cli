# Cliofy CLI

A modern command-line interface for task management with infinite hierarchical nesting, built with Node.js, TypeScript, and React.

## Features

- **Infinite Hierarchical Nesting**: Organize tasks with unlimited depth
- **Modern Terminal UI**: Built with React + Ink for rich terminal interfaces
- **Type-Safe**: Full TypeScript support with runtime validation using Zod
- **Authentication**: Secure JWT-based authentication with automatic token refresh
- **Multiple Output Formats**: Table, JSON, and tree views
- **Task Management**: Create, update, delete, and organize tasks
- **Focus Mode**: Mark important tasks as focused
- **Priority System**: 5-level priority system with visual indicators
- **Tags & Filters**: Organize tasks with tags and advanced filtering
- **Attachment Support**: File attachments for tasks
- **Trash/Recycle Bin**: Soft deletion with recovery options
- **Health Monitoring**: System health checks and connectivity testing

## Architecture

This project follows a monorepo architecture with two main packages:

- **`@cliofy/core`**: Core business logic, API client, and data models
- **`@cliofy/cli`**: Terminal UI components and command implementations

## Installation

### From NPM (Coming Soon)

```bash
pnpm install -g cliofy-cli
```

### From Source

```bash
git clone <repository-url>
cd cliofy-cli
pnpm install
pnpm run build
pnpm link --global packages/cli
```

### Binary Distribution

Download pre-built binaries from the releases page.

## Quick Start

1. **Start the development server** (if running locally):
   ```bash
   cd /path/to/your/web-app
   pnpm dev
   ```

2. **Authenticate**:
   ```bash
   cliofy auth login
   ```

3. **Create your first task**:
   ```bash
   cliofy task create "My first task"
   ```

4. **List your tasks**:
   ```bash
   cliofy task list
   ```

## Usage

### Authentication

```bash
# Login
cliofy auth login

# Register new account
cliofy auth register

# Check authentication status
cliofy auth status

# Logout
cliofy auth logout
```

### Task Management

```bash
# List all tasks
cliofy task list

# Create a new task
cliofy task create "Task title"

# Create a subtask
cliofy task create "Subtask" --parent PARENT_TASK_ID

# Show task details
cliofy task show TASK_ID

# Update a task
cliofy task update TASK_ID --title "New title" --completed true

# Delete a task
cliofy task delete TASK_ID --force

# Mark task as completed
cliofy task complete TASK_ID

# Show tasks as tree
cliofy task tree
```

### Advanced Filtering

```bash
# Show only focused tasks
cliofy task list --focused

# Show high priority tasks
cliofy task list --high-priority

# Filter by tags
cliofy task list --tags "urgent,work"

# Show completed tasks
cliofy task list --completed true

# Use predefined views
cliofy task list --view focused
cliofy task list --view today
cliofy task list --view overdue
```

### Output Formats

```bash
# Table format (default)
cliofy task list

# JSON format
cliofy task list --output json

# Tree format
cliofy task list --output tree

# Detailed table
cliofy task list --details
```

### Health Check

```bash
# Check system health
cliofy health
```

## Configuration

Configuration is stored in `~/.cliofy/` directory:

- `config.json`: Main configuration file
- `session.json`: Authentication session data
- `logs/`: Application logs

### Environment Variables

- `CLIOFY_ENDPOINT`: API endpoint URL (default: http://localhost:5173)
- `CLIOFY_TIMEOUT`: Request timeout in milliseconds (default: 30000)

### Global Options

```bash
# Set custom endpoint
cliofy --endpoint https://api.cliofy.com task list

# Set custom timeout
cliofy --timeout 60000 task list

# JSON output
cliofy --json auth status
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Setup

```bash
# Clone repository
git clone <repository-url>
cd cliofy-cli

# Install dependencies
pnpm install

# Build packages
pnpm run build

# Start development mode
pnpm run dev
```

### Development Scripts

```bash
# Start development servers
pnpm run dev

# Build all packages
pnpm run build

# Build for different targets
pnpm run build:npm          # NPM distribution
pnpm run build:standalone   # Single executable
pnpm run build:binary       # Platform binaries

# Run tests
pnpm test
pnpm run test:unit
pnpm run test:e2e

# Linting and formatting
pnpm run lint
pnpm run format

# Full CI pipeline
pnpm run preflight
```

### Project Structure

```
cliofy-cli/
├── packages/
│   ├── core/           # Core business logic
│   │   ├── src/
│   │   │   ├── config/     # Configuration management
│   │   │   ├── api/        # API client
│   │   │   ├── models/     # Data models and schemas
│   │   │   ├── auth/       # Authentication logic
│   │   │   └── utils/      # Utility functions
│   │   └── package.json
│   └── cli/            # CLI interface
│       ├── src/
│       │   ├── commands/   # Command implementations
│       │   ├── components/ # React components
│       │   ├── hooks/      # Custom hooks
│       │   └── utils/      # CLI utilities
│       └── package.json
├── scripts/            # Build and development scripts
├── docs/              # Documentation
└── package.json       # Root package configuration
```

### Testing

```bash
# Unit tests
pnpm run test:unit

# E2E tests (requires running development server)
pnpm run test:e2e

# Test coverage
pnpm run test:coverage
```

### Adding New Commands

1. Create command component in `packages/cli/src/commands/`
2. Add command logic using React + Ink
3. Register command in main CLI router
4. Add tests and documentation

Example:

```tsx
// packages/cli/src/commands/my-command.tsx
import React from 'react';
import { Box, Text } from 'ink';

export const MyCommand: React.FC<Props> = ({ context, args }) => {
  return (
    <Box>
      <Text>Hello from my command!</Text>
    </Box>
  );
};
```

## API Compatibility

This CLI is designed to work with the Cliofy web application API. It supports:

- Authentication (login/register/token refresh)
- Task CRUD operations
- Task states management (focus, priority, tags)
- Hierarchical task organization
- File attachments
- Trash/recycle bin operations
- User profile management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `npm run preflight` to ensure all checks pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- 📖 Documentation: [docs/](./docs/)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/cliofy/cliofy-cli/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/cliofy/cliofy-cli/discussions)

## Roadmap

- [ ] Interactive prompts with inquirer
- [ ] Plugin system for extensibility
- [ ] Configuration templates
- [ ] Offline mode support
- [ ] Shell completions
- [ ] Task templates
- [ ] Bulk operations
- [ ] Export/import functionality
- [ ] Real-time notifications

---

**Cliofy CLI** - Yet another todo list, but better. 🚀