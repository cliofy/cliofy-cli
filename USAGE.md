# Cliofy CLI 使用指南

## 快速开始

现在你可以使用 `test-cli.js` 来测试 Cliofy CLI 的基本功能。

### 前提条件

1. 确保后端服务运行在 `http://localhost:5173`
2. 使用测试账号：`test@example.com` / `password123`

### 基本使用

#### 1. 健康检查

```bash
node test-cli.js health
```

输出示例：
```
🔍 Checking system health...
✅ System is healthy
Status: healthy
Timestamp: 2025/8/2 13:43:21
Endpoint: http://localhost:5173
```

#### 2. 认证管理

**登录：**
```bash
node test-cli.js auth login test@example.com password123
```

**检查认证状态：**
```bash
node test-cli.js auth status
```

**登出：**
```bash
node test-cli.js auth logout
```

#### 3. 任务管理

**列出所有任务：**
```bash
node test-cli.js task list
```

**创建新任务：**
```bash
node test-cli.js task create "我的新任务"
```

### 测试结果

✅ **已验证功能：**
- 系统健康检查
- 用户登录/登出
- 认证状态管理
- JWT token 自动管理
- 任务列表查看
- 任务创建
- 错误处理和友好提示

### 配置文件

CLI 会在 `~/.cliofy/config.json` 中存储配置信息，包括：
- API 端点配置
- 认证令牌
- 用户信息

### 下一步

这个测试版本验证了核心架构和 API 集成的正确性。现在可以：

1. 继续完善 TypeScript 版本的完整实现
2. 添加更多高级功能（优先级、标签、专注模式等）
3. 实现交互式 UI 组件
4. 添加更多输出格式和过滤选项

### 完整功能对比

| 功能 | 测试版本 | 完整版本计划 |
|------|----------|--------------|
| 健康检查 | ✅ | ✅ |
| 登录/登出 | ✅ | ✅ |
| 任务CRUD | 部分 | ✅ |
| 任务层级 | ❌ | ✅ |
| 优先级管理 | ❌ | ✅ |
| 标签系统 | ❌ | ✅ |
| 专注模式 | ❌ | ✅ |
| 富文本UI | ❌ | ✅ |
| 交互式提示 | ❌ | ✅ |
| 多种输出格式 | 基础 | ✅ |

### 故障排除

**连接问题：**
如果健康检查失败，请确认：
1. 后端服务正在运行：`pnpm dev`
2. 端口 5173 未被占用
3. 网络连接正常

**认证问题：**
如果登录失败，请确认：
1. 测试账号是否存在
2. 密码是否正确
3. 后端认证服务是否正常

**任务操作问题：**
如果任务操作失败，请确认：
1. 已经成功登录
2. Token 未过期
3. 后端任务服务正常