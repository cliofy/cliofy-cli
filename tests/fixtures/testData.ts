/**
 * Test data fixtures for consistent test data across all test suites
 */

import type { Task, User, Config, FirebaseAuthResponse } from '../../packages/core/src';

// User test data
export const mockUsers = {
  validUser: {
    id: 'test-user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-01-01T00:00:00Z'
  },
  
  anotherUser: {
    id: 'test-user-456',
    email: 'another@example.com',
    created_at: '2024-01-02T00:00:00Z',
    email_confirmed_at: '2024-01-02T00:00:00Z',
    last_sign_in_at: '2024-01-02T00:00:00Z'
  }
};

// Firebase auth response test data
export const mockFirebaseAuthResponses = {
  validLogin: {
    idToken: 'mock-firebase-id-token-123',
    refreshToken: 'mock-firebase-refresh-token-123',
    expiresIn: 3600,
    userInfo: {
      uid: mockUsers.validUser.id,
      email: mockUsers.validUser.email,
      emailVerified: true
    }
  },
  
  refreshedToken: {
    idToken: 'mock-new-firebase-id-token-456',
    refreshToken: 'mock-new-firebase-refresh-token-456',
    expiresIn: 3600,
    userInfo: {
      uid: mockUsers.validUser.id,
      email: mockUsers.validUser.email,
      emailVerified: true
    }
  }
};

// Task test data
export const mockTasks = {
  simpleTask: {
    id: 'task-123',
    created_at: '2024-01-01T10:00:00Z',
    user_id: mockUsers.validUser.id,
    title: 'Simple test task',
    content: 'This is a simple test task',
    is_completed: false,
    position: 0,
    attachments: []
  },
  
  completedTask: {
    id: 'task-456',
    created_at: '2024-01-01T11:00:00Z',
    user_id: mockUsers.validUser.id,
    title: 'Completed test task',
    content: 'This task is completed',
    is_completed: true,
    completed_at: '2024-01-01T12:00:00Z',
    position: 1,
    attachments: []
  },
  
  parentTask: {
    id: 'task-parent-789',
    created_at: '2024-01-01T09:00:00Z',
    user_id: mockUsers.validUser.id,
    title: 'Parent task',
    content: 'This is a parent task',
    is_completed: false,
    position: 0,
    attachments: []
  },
  
  childTask: {
    id: 'task-child-101',
    created_at: '2024-01-01T09:30:00Z',
    user_id: mockUsers.validUser.id,
    title: 'Child task',
    content: 'This is a child task',
    is_completed: false,
    parent_id: 'task-parent-789',
    position: 0,
    attachments: []
  },
  
  taskWithStates: {
    id: 'task-states-202',
    created_at: '2024-01-01T13:00:00Z',
    user_id: mockUsers.validUser.id,
    title: 'Task with states',
    content: 'This task has user states',
    is_completed: false,
    position: 2,
    user_states: {
      focused: true,
      archived: false,
      priority: 5,
      tags: ['urgent', 'work'],
      custom_fields: { project: 'cliofy' }
    },
    attachments: []
  },
  
  taskWithTimes: {
    id: 'task-times-303',
    created_at: '2024-01-01T14:00:00Z',
    user_id: mockUsers.validUser.id,
    title: 'Task with times',
    content: 'This task has start and due times',
    is_completed: false,
    position: 3,
    start_time: '2024-01-02T09:00:00Z',
    due_time: '2024-01-03T17:00:00Z',
    attachments: []
  }
};

// Task lists for different scenarios
export const mockTaskLists = {
  empty: [],
  
  simple: [mockTasks.simpleTask, mockTasks.completedTask],
  
  hierarchical: [
    mockTasks.parentTask,
    mockTasks.childTask,
    mockTasks.simpleTask
  ],
  
  withStates: [
    mockTasks.taskWithStates,
    mockTasks.taskWithTimes,
    mockTasks.simpleTask
  ]
};

// Configuration test data
const getTestEndpoint = () => process.env.TEST_API_ENDPOINT || process.env.CLIOFY_ENDPOINT || 'http://localhost:5173';

export const mockConfigs = {
  default: {
    endpoint: getTestEndpoint(),
    timeout: 30000
  },
  
  authenticated: {
    endpoint: getTestEndpoint(),
    timeout: 30000,
    firebaseIdToken: mockFirebaseAuthResponses.validLogin.idToken,
    firebaseRefreshToken: mockFirebaseAuthResponses.validLogin.refreshToken,
    firebaseTokenExpiresAt: Date.now() + 3600000, // 1 hour from now
    firebaseUid: mockUsers.validUser.id,
    userEmail: mockUsers.validUser.email
  },
  
  expired: {
    endpoint: getTestEndpoint(),
    timeout: 30000,
    firebaseIdToken: 'expired-firebase-id-token',
    firebaseRefreshToken: 'expired-firebase-refresh-token',
    firebaseTokenExpiresAt: Date.now() - 3600000, // 1 hour ago
    firebaseUid: mockUsers.validUser.id,
    userEmail: mockUsers.validUser.email
  }
};

// API Error responses
export const mockApiErrors = {
  unauthorized: {
    status: 401,
    data: {
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    }
  },
  
  forbidden: {
    status: 403,
    data: {
      error: 'Forbidden',
      message: 'Access denied'
    }
  },
  
  notFound: {
    status: 404,
    data: {
      error: 'Not Found',
      message: 'Resource not found'
    }
  },
  
  validationError: {
    status: 400,
    data: {
      error: 'Validation Error',
      message: 'Invalid request data',
      details: {
        title: 'Title is required'
      }
    }
  },
  
  serverError: {
    status: 500,
    data: {
      error: 'Internal Server Error',
      message: 'Something went wrong'
    }
  },
  
  networkError: {
    code: 'ECONNREFUSED',
    message: 'Connection refused'
  }
};

// Health check responses
export const mockHealthResponses = {
  healthy: {
    status: 'healthy',
    timestamp: '2024-01-01T12:00:00Z',
    database: 'connected',
    version: '1.0.0'
  },
  
  unhealthy: {
    status: 'unhealthy',
    timestamp: '2024-01-01T12:00:00Z',
    database: 'disconnected',
    version: '1.0.0',
    errors: ['Database connection failed']
  }
};

// CLI command test data
export const mockCliCommands = {
  auth: {
    login: ['auth', 'login', '--email', 'test@example.com', '--password', 'password123'],
    logout: ['auth', 'logout'],
    status: ['auth', 'status'],
    register: ['auth', 'register', '--email', 'new@example.com', '--password', 'newpass123']
  },
  
  task: {
    list: ['task', 'list'],
    listJson: ['task', 'list', '--output', 'json'],
    create: ['task', 'create', 'New test task'],
    createWithParent: ['task', 'create', 'Child task', '--parent', 'task-parent-789'],
    show: ['task', 'show', 'task-123'],
    update: ['task', 'update', 'task-123', '--title', 'Updated task'],
    complete: ['task', 'complete', 'task-123'],
    delete: ['task', 'delete', 'task-123']
  },
  
  health: {
    check: ['health']
  }
};

// Expected CLI outputs
export const mockCliOutputs = {
  auth: {
    loginSuccess: 'Successfully logged in',
    loginFailed: 'Authentication failed',
    logoutSuccess: 'Successfully logged out',
    notAuthenticated: 'Not authenticated',
    alreadyAuthenticated: 'Already authenticated'
  },
  
  task: {
    created: 'Task created successfully',
    updated: 'Task updated successfully',
    completed: 'Task marked as completed',
    deleted: 'Task deleted successfully',
    notFound: 'Task not found',
    authRequired: 'Authentication required'
  },
  
  health: {
    healthy: 'System is healthy',
    unhealthy: 'System is unhealthy'
  }
};

// Utility functions for test data generation
export const generateMockTask = (overrides: Partial<Task> = {}): Task => ({
  ...mockTasks.simpleTask,
  id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  created_at: new Date().toISOString(),
  ...overrides
});

export const generateMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockUsers.validUser,
  id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  email: `test-${Date.now()}@example.com`,
  ...overrides
});

export const generateMockConfig = (overrides: Partial<Config> = {}): Config => ({
  ...mockConfigs.default,
  ...overrides
});