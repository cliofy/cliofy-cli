/**
 * API client for Cliofy CLI
 * Handles all HTTP requests to the backend API with automatic token refresh
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ConfigManager } from '../config/manager';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  AuthVerifyResponse,
  UserProfile,
  UserProfileResponse,
  UpdateProfileRequest,
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
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
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
        if (this.configManager.needsTokenRefresh() && !this.isRefreshing) {
          await this.refreshTokenIfNeeded();
        }

        // Add auth header if available
        const apiKey = this.configManager.config.apiKey;
        if (apiKey) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${apiKey}`;
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
            // Retry original request with new token
            const apiKey = this.configManager.config.apiKey;
            if (apiKey && originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${apiKey}`;
              return this.httpClient.request(originalRequest);
            }
          } catch (refreshError) {
            this.configManager.clearTokens();
            throw new APIError('Authentication failed', 401, 'Token refresh failed');
          }
        }

        throw this.handleError(error);
      }
    );
  }

  /**
   * Refresh access token if needed
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.configManager.needsTokenRefresh()) {
      return;
    }

    const refreshToken = this.configManager.getRefreshToken();
    if (!refreshToken) {
      throw new APIError('No refresh token available', 401);
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
   * Perform actual token refresh
   */
  private async performTokenRefresh(refreshToken: string): Promise<void> {
    try {
      const response = await axios.post(
        `${this.configManager.config.endpoint}/api/auth/refresh`,
        { refreshToken },
        { timeout: this.configManager.config.timeout }
      );

      const refreshResponse = RefreshTokenResponse.parse(response.data);
      
      this.configManager.updateTokens(
        refreshResponse.accessToken,
        refreshResponse.refreshToken,
        refreshResponse.expiresIn
      );
    } catch (error) {
      this.configManager.clearTokens();
      throw new APIError('Token refresh failed', 401, this.getErrorMessage(error));
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
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const loginData = LoginRequest.parse({ email, password });
    
    try {
      const response = await this.httpClient.post('/api/auth/login', loginData);
      return AuthResponse.parse(response.data);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Register new user
   */
  async register(email: string, password: string): Promise<RegisterResponse> {
    const registerData = RegisterRequest.parse({ email, password });
    
    try {
      const response = await this.httpClient.post('/api/auth/register', registerData);
      return RegisterResponse.parse(response.data);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<AuthVerifyResponse> {
    try {
      const response = await this.httpClient.post('/api/auth/verify');
      return AuthVerifyResponse.parse(response.data);
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
      const profileResponse = UserProfileResponse.parse(response.data);
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
      const profileResponse = UserProfileResponse.parse(response.data);
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

      return response.data.map((taskData: any) => Task.parse(taskData));
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Create new task
   */
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    try {
      const validatedData = CreateTaskRequest.parse(taskData);
      const response = await this.httpClient.post('/api/tasks', validatedData);
      return Task.parse(response.data);
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
      const validatedData = UpdateTaskRequest.parse(updateData);
      const response = await this.httpClient.patch(`/api/tasks/${taskId}`, validatedData);
      return Task.parse(response.data);
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