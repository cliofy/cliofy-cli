/**
 * API client for Cliofy CLI
 * Handles all HTTP requests to the backend API with automatic token refresh
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ConfigManager } from '../config/manager';
import { FirebaseAuthService, FirebaseAuthError } from '../firebase/auth';
import {
  AuthVerifyResponse,
  UserProfile,
  UserProfileResponse,
  UpdateProfileRequest,
  AuthVerifyResponseSchema,
  UserProfileResponseSchema,
  // Firebase types
  FirebaseBackendLoginRequest,
  FirebaseBackendLoginResponse,
} from '../models/auth';
import {
  Task,
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
  TaskSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
} from '../models/task';

/**
 * Custom API error class
 */
export class APIError extends Error {
  public readonly statusCode?: number;
  public readonly details?: string;

  constructor(message: string, statusCode?: number, details?: string) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * API response wrapper
 */
interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

/**
 * Main API client class
 */
export class APIClient {
  private static instance: APIClient | null = null;
  private httpClient: AxiosInstance;
  private configManager: ConfigManager;
  private firebaseAuthService: FirebaseAuthService;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.firebaseAuthService = new FirebaseAuthService();
    this.httpClient = this.createHttpClient();
    this.setupInterceptors();
  }

  /**
   * Get singleton instance
   */
  static getInstance(configManager?: ConfigManager): APIClient {
    if (!APIClient.instance && configManager) {
      APIClient.instance = new APIClient(configManager);
    } else if (!APIClient.instance) {
      throw new Error('APIClient must be initialized with ConfigManager first');
    }
    return APIClient.instance;
  }

  /**
   * Create configured HTTP client
   */
  private createHttpClient(): AxiosInstance {
    const config = this.configManager.config;
    
    return axios.create({
      baseURL: config.endpoint.replace(/\/$/, ''), // Remove trailing slash
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'cliofy-cli/0.1.0',
      },
    });
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor to add auth headers
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Check if token needs refresh before making request
        await this.refreshTokenIfNeeded();

        // Add auth headers using ConfigManager's getApiHeaders method
        // This automatically handles Firebase ID Token vs traditional JWT priority
        const authHeaders = this.configManager.getApiHeaders();
        if (config.headers) {
          Object.assign(config.headers, authHeaders);
        } else {
          config.headers = authHeaders as any;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors and token refresh
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && originalRequest && !this.isRefreshing) {
          try {
            await this.refreshTokenIfNeeded();
            
            // Retry original request with new auth headers
            if (originalRequest.headers && this.configManager.isAuthenticated()) {
              const authHeaders = this.configManager.getApiHeaders();
              Object.assign(originalRequest.headers, authHeaders);
              return this.httpClient.request(originalRequest);
            }
          } catch (refreshError) {
            // Clear Firebase tokens on error
            this.configManager.clearTokens();
            throw new APIError('Authentication failed', 401, 'Token refresh failed');
          }
        }

        throw this.handleError(error);
      }
    );
  }

  /**
   * Refresh Firebase ID token if needed
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Check if Firebase token refresh is needed
    if (!this.configManager.needsFirebaseTokenRefresh()) {
      return;
    }

    // Get Firebase refresh token
    const refreshToken = this.configManager.getFirebaseRefreshToken();
    if (!refreshToken) {
      throw new APIError('No Firebase refresh token available', 401);
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh(refreshToken);

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform Firebase token refresh
   */
  private async performTokenRefresh(refreshToken: string): Promise<void> {
    try {
      const refreshResult = await this.firebaseAuthService.refreshIdToken(refreshToken);
      
      // Update configuration with new Firebase tokens
      this.configManager.updateFirebaseTokens(
        refreshResult.idToken,
        refreshResult.refreshToken,
        refreshResult.expiresIn,
        this.configManager.getFirebaseUid()!,
        this.configManager.getUserEmail()
      );
    } catch (error) {
      // Clear Firebase tokens on error
      this.configManager.clearFirebaseTokens();
      
      const errorMessage = error instanceof FirebaseAuthError 
        ? error.message 
        : this.getErrorMessage(error);
      throw new APIError('Token refresh failed', 401, errorMessage);
    }
  }

  /**
   * Handle HTTP errors and convert to APIError
   */
  private handleError(error: AxiosError): APIError {
    if (error.response) {
      const { status, data } = error.response;
      const message = this.extractErrorMessage(data);
      const details = this.extractErrorDetails(data);
      return new APIError(message, status, details);
    } else if (error.request) {
      return new APIError(`Network error: Could not connect to ${this.configManager.config.endpoint}`);
    } else {
      return new APIError(`Request error: ${error.message}`);
    }
  }

  /**
   * Extract error message from response data
   */
  private extractErrorMessage(data: any): string {
    if (typeof data === 'string') return data;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    return 'Unknown error occurred';
  }

  /**
   * Extract error details from response data
   */
  private extractErrorDetails(data: any): string | undefined {
    if (data?.details) return data.details;
    if (data?.description) return data.description;
    return undefined;
  }

  /**
   * Get error message from any error type
   */
  private getErrorMessage(error: any): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
  }

  // Authentication API methods

  /**
   * Login user with Firebase ID Token
   * This is the primary authentication method for Firebase auth
   */
  async firebaseLogin(idToken: string, userInfo: any): Promise<FirebaseBackendLoginResponse> {
    const loginData: FirebaseBackendLoginRequest = { 
      firebaseToken: idToken,
      user: userInfo 
    };
    
    try {
      const response = await this.httpClient.post('/api/auth/firebase-login', loginData);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }


  /**
   * Verify current Firebase ID token
   */
  async verifyToken(): Promise<AuthVerifyResponse> {
    try {
      const idToken = this.configManager.config.firebaseIdToken;
      if (!idToken) {
        throw new APIError('No Firebase ID token available', 401);
      }

      try {
        const userInfo = await this.firebaseAuthService.verifyIdToken(idToken);
        return {
          valid: true,
          user_id: userInfo.uid,
        };
      } catch (error) {
        if (error instanceof FirebaseAuthError) {
          return {
            valid: false,
            error: error.message,
          };
        }
        throw error;
      }
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<UserProfile> {
    try {
      const response = await this.httpClient.get('/api/user/profile');
      const profileResponse = UserProfileResponseSchema.parse(response.data);
      return profileResponse.profile;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updateData: UpdateProfileRequest): Promise<UserProfile> {
    try {
      const response = await this.httpClient.put('/api/user/profile', updateData);
      const profileResponse = UserProfileResponseSchema.parse(response.data);
      return profileResponse.profile;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // Task API methods

  /**
   * List tasks with optional filtering
   */
  async listTasks(filter?: TaskFilter): Promise<Task[]> {
    try {
      const params = filter ? this.buildQueryParams(filter) : {};
      const response = await this.httpClient.get('/api/tasks', { params });
      
      if (!Array.isArray(response.data)) {
        throw new APIError('Invalid response format: expected array of tasks');
      }

      return response.data.map((taskData: any) => TaskSchema.parse(taskData));
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Create new task
   */
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    try {
      const validatedData = CreateTaskRequestSchema.parse(taskData);
      const response = await this.httpClient.post('/api/tasks', validatedData);
      return TaskSchema.parse(response.data);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get specific task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    // Since there's no dedicated GET /tasks/{id} endpoint,
    // we'll find it in the list of all tasks
    const tasks = await this.listTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new APIError(`Task with ID ${taskId} not found`, 404);
    }
    
    return task;
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, updateData: UpdateTaskRequest): Promise<Task> {
    try {
      const validatedData = UpdateTaskRequestSchema.parse(updateData);
      const response = await this.httpClient.patch(`/api/tasks/${taskId}`, validatedData);
      return TaskSchema.parse(response.data);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.httpClient.delete(`/api/tasks/${taskId}`);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Build query parameters from filter object
   */
  private buildQueryParams(filter: TaskFilter): Record<string, string> {
    const params: Record<string, string> = {};
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    });
    
    return params;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.httpClient.get('/api/health-check');
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get base URL for debugging
   */
  getBaseURL(): string {
    return this.configManager.config.endpoint;
  }

  /**
   * Reset client (useful for testing)
   */
  static reset(): void {
    APIClient.instance = null;
  }
}