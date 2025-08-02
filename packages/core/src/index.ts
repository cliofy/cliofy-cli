/**
 * Core package entry point
 * Exports all public APIs for the Cliofy CLI core functionality
 */

// Configuration
export { ConfigManager } from './config/manager';
export type { Config, ConfigUpdate } from './config/types';
export { DEFAULT_CONFIG, CONFIG_PATHS } from './config/types';

// API Client
export { APIClient, APIError } from './api/client';

// Authentication
export { AuthManager } from './auth/manager';
export { AuthStatus, AuthHelpers } from './models/auth';
export type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  AuthVerifyResponse,
  UserProfile,
  UserProfileResponse,
  UpdateProfileRequest,
  User,
  AuthError,
} from './models/auth';

// Task Models
export type {
  Task,
  TaskWithProperties,
  TaskFilter,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskNote,
  CreateTaskNoteRequest,
  UpdateTaskNoteRequest,
  TaskUserStates,
  TaskStatesUpdateRequest,
  TaskStatesUpdateResponse,
  TaskStateUpdate,
  TaskStatesBatchUpdateRequest,
  TaskStatesBatchUpdateResponse,
  Attachment,
  CreateAttachmentRequest,
} from './models/task';

export { TaskHelpers } from './models/task';

// Schemas for validation
export {
  TaskSchema,
  TaskFilterSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
  TaskNoteSchema,
  CreateTaskNoteRequestSchema,
  UpdateTaskNoteRequestSchema,
  TaskUserStatesSchema,
  AttachmentSchema,
  CreateAttachmentRequestSchema,
} from './models/task';

export {
  LoginRequestSchema,
  RegisterRequestSchema,
  AuthResponseSchema,
  RegisterResponseSchema,
  RefreshTokenRequestSchema,
  RefreshTokenResponseSchema,
  AuthVerifyResponseSchema,
  UserProfileSchema,
  UserProfileResponseSchema,
  UpdateProfileRequestSchema,
  UserSchema,
  AuthErrorSchema,
} from './models/auth';

// Utility types
export interface CoreContext {
  configManager: ConfigManager;
  apiClient: APIClient;
  authManager: AuthManager;
}

/**
 * Initialize core context with all managers
 */
export function createCoreContext(configDir?: string): CoreContext {
  const configManager = new ConfigManager(configDir);
  const apiClient = APIClient.getInstance(configManager);
  const authManager = new AuthManager(configManager);

  return {
    configManager,
    apiClient,
    authManager,
  };
}

/**
 * Version information
 */
export const VERSION = '0.1.0';
export const USER_AGENT = `cliofy-cli/${VERSION}`;

/**
 * Common error types
 */
export class CLIError extends Error {
  public readonly code?: string;
  
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'CLIError';
    this.code = code;
  }
}

export class AuthenticationError extends CLIError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends CLIError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class NetworkError extends CLIError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}