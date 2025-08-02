#!/usr/bin/env node

/**
 * 简单的测试版 CLI，用于快速验证基本功能
 */

const yargs = require('yargs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple color functions without chalk
const chalk = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
};

// 配置目录
const CONFIG_DIR = path.join(os.homedir(), '.cliofy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// 确保配置目录存在
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.warn('Failed to load config:', error.message);
  }
  
  return {
    endpoint: 'http://localhost:5173',
    timeout: 30000
  };
}

// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error.message);
  }
}

// 获取 API 头部
function getApiHeaders(config) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'cliofy-cli-test/0.1.0'
  };
  
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }
  
  return headers;
}

// 登录命令
async function login(email, password) {
  const config = loadConfig();
  
  try {
    console.log(chalk.blue('🔐 Authenticating...'));
    
    const response = await axios.post(`${config.endpoint}/api/auth/login`, {
      email,
      password
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: config.timeout
    });
    
    const { accessToken, refreshToken, expiresIn, user } = response.data;
    
    // 保存认证信息
    config.apiKey = accessToken;
    config.refreshToken = refreshToken;
    config.tokenExpiresAt = Date.now() + (expiresIn * 1000);
    config.userId = user.id;
    config.lastLogin = new Date().toISOString();
    
    saveConfig(config);
    
    console.log(chalk.green('✅ Successfully logged in!'));
    console.log(`User: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    
  } catch (error) {
    if (error.response) {
      console.error(chalk.red(`❌ Login failed: ${error.response.data.error || error.message}`));
    } else {
      console.error(chalk.red(`❌ Network error: ${error.message}`));
    }
    process.exit(1);
  }
}

// 检查认证状态
function checkAuth() {
  const config = loadConfig();
  
  if (!config.apiKey || !config.userId) {
    console.log(chalk.red('❌ Not authenticated'));
    console.log(chalk.yellow('💡 Run "node test-cli.js auth login" to authenticate'));
    return false;
  }
  
  // 检查 token 是否过期
  if (config.tokenExpiresAt && Date.now() >= config.tokenExpiresAt) {
    console.log(chalk.yellow('⚠️  Token expired'));
    console.log(chalk.yellow('💡 Run "node test-cli.js auth login" to re-authenticate'));
    return false;
  }
  
  return true;
}

// 认证状态命令
function authStatus() {
  const config = loadConfig();
  
  if (config.apiKey && config.userId) {
    console.log(chalk.green('✅ Authenticated'));
    console.log(`Endpoint: ${config.endpoint}`);
    console.log(`User ID: ${config.userId}`);
    console.log(`Last Login: ${config.lastLogin || 'Unknown'}`);
    
    if (config.tokenExpiresAt) {
      const expiresAt = new Date(config.tokenExpiresAt);
      console.log(`Token expires: ${expiresAt.toLocaleString()}`);
    }
  } else {
    console.log(chalk.red('❌ Not authenticated'));
    console.log(chalk.yellow('💡 Run "node test-cli.js auth login" to authenticate'));
  }
}

// 登出命令
function logout() {
  const config = loadConfig();
  
  delete config.apiKey;
  delete config.refreshToken;
  delete config.tokenExpiresAt;
  delete config.userId;
  delete config.lastLogin;
  
  saveConfig(config);
  
  console.log(chalk.green('✅ Successfully logged out'));
}

// 列出任务
async function listTasks() {
  if (!checkAuth()) return;
  
  const config = loadConfig();
  
  try {
    console.log(chalk.blue('📋 Fetching tasks...'));
    
    const response = await axios.get(`${config.endpoint}/api/tasks`, {
      headers: getApiHeaders(config),
      timeout: config.timeout
    });
    
    const tasks = response.data;
    
    if (tasks.length === 0) {
      console.log('No tasks found.');
      return;
    }
    
    console.log(chalk.cyan('\n📋 Tasks:\n'));
    
    tasks.forEach((task, index) => {
      const status = task.is_completed ? chalk.green('✅ Done') : chalk.yellow('⏳ Todo');
      const title = task.title;
      const id = task.id.slice(0, 8);
      
      console.log(`${index + 1}. ${status} ${title} (${id})`);
      
      if (task.content) {
        console.log(`   ${chalk.gray(task.content.slice(0, 60))}${task.content.length > 60 ? '...' : ''}`);
      }
      
      if (task.start_time) {
        console.log(`   ${chalk.blue('Start:')} ${new Date(task.start_time).toLocaleString()}`);
      }
      
      if (task.due_time) {
        console.log(`   ${chalk.green('Due:')} ${new Date(task.due_time).toLocaleString()}`);
      }
      
      console.log('');
    });
    
    const completed = tasks.filter(t => t.is_completed).length;
    console.log(chalk.cyan(`📊 Total: ${tasks.length} tasks, ${completed} completed`));
    
  } catch (error) {
    if (error.response) {
      console.error(chalk.red(`❌ API Error: ${error.response.data.error || error.message}`));
    } else {
      console.error(chalk.red(`❌ Network error: ${error.message}`));
    }
    process.exit(1);
  }
}

// 创建任务
async function createTask(title) {
  if (!checkAuth()) return;
  
  const config = loadConfig();
  
  try {
    console.log(chalk.blue('➕ Creating task...'));
    
    const response = await axios.post(`${config.endpoint}/api/tasks`, {
      title: title,
      position: 0
    }, {
      headers: getApiHeaders(config),
      timeout: config.timeout
    });
    
    const task = response.data;
    
    console.log(chalk.green('✅ Task created successfully!'));
    console.log(`Title: ${task.title}`);
    console.log(`ID: ${task.id}`);
    console.log(`Created: ${new Date(task.created_at).toLocaleString()}`);
    
  } catch (error) {
    if (error.response) {
      console.error(chalk.red(`❌ API Error: ${error.response.data.error || error.message}`));
    } else {
      console.error(chalk.red(`❌ Network error: ${error.message}`));
    }
    process.exit(1);
  }
}

// 健康检查
async function healthCheck() {
  const config = loadConfig();
  
  try {
    console.log(chalk.blue('🔍 Checking system health...'));
    
    const response = await axios.get(`${config.endpoint}/api/health-check`, {
      timeout: config.timeout
    });
    
    console.log(chalk.green('✅ System is healthy'));
    console.log(`Status: ${response.data.status}`);
    console.log(`Timestamp: ${new Date(response.data.timestamp).toLocaleString()}`);
    console.log(`Endpoint: ${config.endpoint}`);
    
  } catch (error) {
    console.error(chalk.red('❌ Health check failed'));
    
    if (error.response) {
      console.error(chalk.red(`API Error: ${error.response.status} ${error.response.statusText}`));
    } else {
      console.error(chalk.red(`Network error: ${error.message}`));
    }
    
    console.log(chalk.yellow('\nThis usually means:'));
    console.log(chalk.yellow('• The API server is not running'));
    console.log(chalk.yellow('• Network connectivity issues'));
    console.log(chalk.yellow('• Invalid endpoint configuration'));
    console.log(chalk.yellow(`\nCurrent endpoint: ${config.endpoint}`));
    
    process.exit(1);
  }
}

// CLI 接口
yargs
  .scriptName('cliofy-test')
  .usage('$0 <command> [options]')
  .help('help')
  .alias('help', 'h')
  .version('0.1.0')
  
  .command('auth <subcommand>', 'Authentication commands', (yargs) => {
    return yargs
      .command('login [email] [password]', 'Log in to your Cliofy account', {}, async (argv) => {
        const email = argv.email || 'test@example.com';
        const password = argv.password || 'password123';
        await login(email, password);
      })
      .command('status', 'Show authentication status', {}, () => {
        authStatus();
      })
      .command('logout', 'Log out of your Cliofy account', {}, () => {
        logout();
      })
      .demandCommand(1, 'Please specify an auth subcommand');
  })
  
  .command('task <subcommand>', 'Task management commands', (yargs) => {
    return yargs
      .command('list', 'List all tasks', {}, async () => {
        await listTasks();
      })
      .command('create <title>', 'Create a new task', {}, async (argv) => {
        await createTask(argv.title);
      })
      .demandCommand(1, 'Please specify a task subcommand');
  })
  
  .command('health', 'Check system health', {}, async () => {
    await healthCheck();
  })
  
  .demandCommand(1, 'Please specify a command')
  .strict()
  .parse();