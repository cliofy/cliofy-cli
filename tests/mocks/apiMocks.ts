/**
 * API mocks for testing with axios-mock-adapter and manual mocks
 */

import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { mockFirebaseAuthResponses, mockTasks, mockTaskLists, mockApiErrors, mockHealthResponses } from '../fixtures/testData';

// Create axios mock adapter
export const createApiMock = () => {
  const mock = new MockAdapter(axios);
  
  // Reset all mocks
  mock.reset();
  
  return mock;
};

// Setup common API mocks
export const setupCommonApiMocks = (mock: MockAdapter) => {
  // Health check endpoint
  mock.onGet('/api/health-check').reply(200, mockHealthResponses.healthy);
  
  // Firebase Auth endpoints
  mock.onPost('/api/auth/firebase-login').reply((config) => {
    const { firebaseToken, user } = JSON.parse(config.data);
    
    if (firebaseToken === 'mock-firebase-id-token-123' && user?.email === 'test@example.com') {
      return [200, { 
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name
        }
      }];
    } else if (firebaseToken === 'invalid-firebase-token') {
      return [401, mockApiErrors.unauthorized.data];
    } else {
      return [400, mockApiErrors.validationError.data];
    }
  });
  
  mock.onPost('/api/auth/logout').reply(200, { message: 'Logged out successfully' });
  
  // Tasks endpoints
  mock.onGet('/api/tasks').reply((config) => {
    const authHeader = config.headers?.Authorization;
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return [401, mockApiErrors.unauthorized.data];
    }
    
    // Return different task lists based on query params
    const params = new URLSearchParams(config.params);
    const parentId = params.get('parent_id');
    
    if (parentId) {
      return [200, mockTaskLists.hierarchical.filter(t => t.parent_id === parentId)];
    }
    
    return [200, mockTaskLists.simple];
  });
  
  mock.onPost('/api/tasks').reply((config) => {
    const authHeader = config.headers?.Authorization;
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return [401, mockApiErrors.unauthorized.data];
    }
    
    const { title, content, parent_id, position } = JSON.parse(config.data);
    
    if (!title) {
      return [400, mockApiErrors.validationError.data];
    }
    
    const newTask = {
      ...mockTasks.simpleTask,
      id: `task-${Date.now()}`,
      title,
      content: content || '',
      parent_id,
      position: position || 0,
      created_at: new Date().toISOString()
    };
    
    return [201, newTask];
  });
  
  mock.onGet(/\/api\/tasks\/(.+)/).reply((config) => {
    const authHeader = config.headers?.Authorization;
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return [401, mockApiErrors.unauthorized.data];
    }
    
    const taskId = config.url?.split('/').pop();
    const task = Object.values(mockTasks).find(t => t.id === taskId);
    
    if (task) {
      return [200, task];
    } else {
      return [404, mockApiErrors.notFound.data];
    }
  });
  
  mock.onPut(/\/api\/tasks\/(.+)/).reply((config) => {
    const authHeader = config.headers?.Authorization;
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return [401, mockApiErrors.unauthorized.data];
    }
    
    const taskId = config.url?.split('/').pop();
    const updates = JSON.parse(config.data);
    const task = Object.values(mockTasks).find(t => t.id === taskId);
    
    if (task) {
      const updatedTask = { ...task, ...updates };
      return [200, updatedTask];
    } else {
      return [404, mockApiErrors.notFound.data];
    }
  });
  
  mock.onDelete(/\/api\/tasks\/(.+)/).reply((config) => {
    const authHeader = config.headers?.Authorization;
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return [401, mockApiErrors.unauthorized.data];
    }
    
    const taskId = config.url?.split('/').pop();
    const task = Object.values(mockTasks).find(t => t.id === taskId);
    
    if (task) {
      return [200, { message: 'Task deleted successfully' }];
    } else {
      return [404, mockApiErrors.notFound.data];
    }
  });
  
  // Task states endpoints
  mock.onPut(/\/api\/tasks\/(.+)\/states/).reply((config) => {
    const authHeader = config.headers?.Authorization;
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return [401, mockApiErrors.unauthorized.data];
    }
    
    const taskId = config.url?.split('/')[3];
    const { states } = JSON.parse(config.data);
    
    return [200, { updated_states: states }];
  });
  
  // Batch operations
  mock.onPost('/api/tasks/batch/states').reply((config) => {
    const authHeader = config.headers?.Authorization;
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return [401, mockApiErrors.unauthorized.data];
    }
    
    const { updates } = JSON.parse(config.data);
    
    return [200, {
      updated_count: updates.length,
      failed_count: 0,
      updated_tasks: updates.map((u: any) => ({ ...mockTasks.simpleTask, id: u.task_id })),
      errors: []
    }];
  });
};

// Setup error scenarios
export const setupErrorScenarios = (mock: MockAdapter) => {
  // Network timeout
  mock.onAny('/api/timeout').timeout();
  
  // Network error
  mock.onAny('/api/network-error').networkError();
  
  // Server error
  mock.onAny('/api/server-error').reply(500, mockApiErrors.serverError.data);
  
  // Rate limiting
  mock.onAny('/api/rate-limited').reply(429, { error: 'Too Many Requests' });
};

// Manual mocks for modules
export const axiosMock = {
  get: jest.fn(),
  post: jest.fn(), 
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  create: jest.fn(() => axiosMock),
  defaults: {
    headers: {
      common: {}
    }
  },
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
};

// Mock implementations for different scenarios
export const mockApiResponses = {
  // Successful responses
  healthCheck: () => Promise.resolve({ data: mockHealthResponses.healthy }),
  firebaseLogin: () => Promise.resolve({ 
    data: { 
      success: true,
      user: mockFirebaseAuthResponses.validLogin.userInfo
    }
  }),
  taskList: () => Promise.resolve({ data: mockTaskLists.simple }),
  taskCreate: (title: string) => Promise.resolve({ 
    data: { ...mockTasks.simpleTask, title, id: `task-${Date.now()}` }
  }),
  
  // Error responses  
  unauthorized: () => Promise.reject({ 
    response: { status: 401, data: mockApiErrors.unauthorized.data }
  }),
  networkError: () => Promise.reject({ 
    code: 'ECONNREFUSED', 
    message: 'Connection refused' 
  }),
  timeout: () => Promise.reject({ 
    code: 'ECONNABORTED', 
    message: 'timeout of 30000ms exceeded' 
  })
};