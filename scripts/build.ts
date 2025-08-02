#!/usr/bin/env tsx

/**
 * Build script for creating production builds
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { build } from 'esbuild';

const ROOT_DIR = path.resolve(__dirname, '..');
const CORE_DIR = path.join(ROOT_DIR, 'packages', 'core');
const CLI_DIR = path.join(ROOT_DIR, 'packages', 'cli');
const BIN_DIR = path.join(ROOT_DIR, 'bin');

interface BuildOptions {
  target?: 'npm' | 'standalone' | 'binary';
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd, stdio: 'inherit' });
    process.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function buildCore(): Promise<void> {
  console.log(chalk.blue('📦 Building core package...'));
  await runCommand('pnpm', ['run', 'build'], CORE_DIR);
  console.log(chalk.green('✅ Core package built successfully'));
}

async function buildCLI(): Promise<void> {
  console.log(chalk.blue('📦 Building CLI package...'));
  await runCommand('pnpm', ['run', 'build'], CLI_DIR);
  console.log(chalk.green('✅ CLI package built successfully'));
}

async function buildStandalone(): Promise<void> {
  console.log(chalk.blue('📦 Building standalone executable...'));
  
  const entryPoint = path.join(CLI_DIR, 'src', 'index.ts');
  const outFile = path.join(CLI_DIR, 'dist', 'cliofy.js');

  await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: outFile,
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: [
      // Mark these as external to avoid bundling native modules
      'keytar',
    ],
    format: 'cjs',
    minify: true,
    sourcemap: false,
  });

  // Make executable
  await fs.chmod(outFile, '755');
  
  console.log(chalk.green('✅ Standalone executable built successfully'));
}

async function buildBinary(): Promise<void> {
  console.log(chalk.blue('📦 Building binary executables...'));
  
  // Ensure bin directory exists
  await fs.mkdir(BIN_DIR, { recursive: true });
  
  const standalonePath = path.join(CLI_DIR, 'dist', 'cliofy.js');
  
  // Build binary using pkg
  await runCommand('npx', [
    'pkg',
    standalonePath,
    '--out-path',
    BIN_DIR,
    '--targets',
    'node18-linux-x64,node18-macos-x64,node18-win-x64',
  ], ROOT_DIR);
  
  console.log(chalk.green('✅ Binary executables built successfully'));
  console.log(chalk.cyan(`📂 Binaries available in: ${BIN_DIR}`));
}

async function clean(): Promise<void> {
  console.log(chalk.yellow('🧹 Cleaning previous builds...'));
  
  const cleanPaths = [
    path.join(CORE_DIR, 'dist'),
    path.join(CLI_DIR, 'dist'),
    BIN_DIR,
  ];
  
  for (const cleanPath of cleanPaths) {
    try {
      await fs.rm(cleanPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  }
  
  console.log(chalk.green('✅ Cleaned previous builds'));
}

async function buildAll(options: BuildOptions = {}): Promise<void> {
  const { target = 'npm' } = options;
  
  try {
    await clean();
    
    // Always build core first
    await buildCore();
    
    if (target === 'npm') {
      await buildCLI();
    } else if (target === 'standalone') {
      await buildCLI();
      await buildStandalone();
    } else if (target === 'binary') {
      await buildCLI();
      await buildStandalone();
      await buildBinary();
    }
    
    console.log(chalk.green.bold('\n🎉 Build completed successfully!'));
    
    if (target === 'npm') {
      console.log(chalk.cyan('💡 To install globally: npm install -g packages/cli'));
    } else if (target === 'standalone') {
      console.log(chalk.cyan('💡 Standalone executable: packages/cli/dist/cliofy.js'));
    } else if (target === 'binary') {
      console.log(chalk.cyan('💡 Binary executables available in: bin/'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Build failed:'), error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const target = process.argv[2] as BuildOptions['target'] || 'npm';
  buildAll({ target });
}