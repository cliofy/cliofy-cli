/**
 * Authentication manager for Cliofy CLI
 * Handles user authentication, token management, and session state
 */

import { ConfigManager } from '../config/manager';
import { APIClient } from '../api/client';
import {
  AuthResponse,
  RegisterResponse,
  AuthVerifyResponse,
  UserProfile,
  AuthStatus,
  AuthHelpers,
} from '../models/auth';

/**
 * Authentication manager class
 */
export class AuthManager {
  private configManager: ConfigManager;
  private apiClient: APIClient;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.apiClient = APIClient.getInstance(configManager);
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
  }> {
    try {
      // Validate input
      if (!AuthHelpers.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      if (!password || password.length < 1) {
        return { success: false, error: 'Password is required' };
      }

      // Attempt login
      const authResponse = await this.apiClient.login(email, password);

      // Update configuration with auth data
      this.configManager.updateTokens(
        authResponse.accessToken,
        authResponse.refreshToken,
        authResponse.expiresIn
      );

      this.configManager.updateConfig({
        userId: authResponse.user.id,
        lastLogin: authResponse.user.last_sign_in_at || new Date().toISOString(),
      });

      // Convert User to UserProfile format for consistency
      const userProfile: UserProfile = {
        id: authResponse.user.id,
        email: authResponse.user.email,
        created_at: authResponse.user.created_at,
        updated_at: authResponse.user.created_at, // Use created_at as fallback
        last_sign_in_at: authResponse.user.last_sign_in_at,
        display_name: undefined,
        avatar_url: undefined,
        timezone: undefined,
        language: undefined,
      };

      return { success: true, user: userProfile };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Register new user
   */
  async register(email: string, password: string): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
  }> {
    try {
      // Validate input
      if (!AuthHelpers.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      const passwordValidation = AuthHelpers.isValidPassword(password);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.errors.join(', ') };
      }

      // Attempt registration
      const registerResponse = await this.apiClient.register(email, password);

      // Convert User to UserProfile format
      const userProfile: UserProfile = {
        id: registerResponse.user.id,
        email: registerResponse.user.email,
        created_at: registerResponse.user.created_at,
        updated_at: registerResponse.user.created_at,
        last_sign_in_at: registerResponse.user.last_sign_in_at,
        display_name: undefined,
        avatar_url: undefined,
        timezone: undefined,
        language: undefined,
      };

      return { success: true, user: userProfile };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Logout user and clear session
   */
  logout(): void {
    this.configManager.clearTokens();
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.configManager.isAuthenticated();
  }

  /**
   * Get current authentication status
   */
  getAuthStatus(): AuthStatus {
    if (!this.configManager.config.apiKey) {
      return AuthStatus.UNAUTHENTICATED;
    }

    if (this.configManager.needsTokenRefresh()) {
      const refreshToken = this.configManager.getRefreshToken();
      if (!refreshToken) {
        return AuthStatus.TOKEN_EXPIRED;
      }
      return AuthStatus.TOKEN_EXPIRED;
    }

    return AuthStatus.AUTHENTICATED;
  }

  /**
   * Verify current token with the server
   */
  async verifyToken(): Promise<{
    valid: boolean;
    userId?: string;
    error?: string;
  }> {
    try {
      if (!this.isAuthenticated()) {
        return { valid: false, error: 'Not authenticated' };
      }

      const verifyResponse = await this.apiClient.verifyToken();

      if (verifyResponse.valid) {
        return {
          valid: true,
          userId: verifyResponse.user_id,
        };
      } else {
        // Token is invalid, clear it
        this.configManager.clearTokens();
        return {
          valid: false,
          error: verifyResponse.error || 'Token is invalid',
        };
      }
    } catch (error) {
      // Network or other error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
  }> {
    try {
      if (!this.isAuthenticated()) {
        return { success: false, error: 'Not authenticated' };
      }

      const userProfile = await this.apiClient.getUserProfile();
      return { success: true, user: userProfile };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get current user ID from config
   */
  getCurrentUserId(): string | undefined {
    return this.configManager.config.userId;
  }

  /**
   * Get last login timestamp
   */
  getLastLogin(): string | undefined {
    return this.configManager.config.lastLogin;
  }

  /**
   * Check if token needs refresh
   */
  needsTokenRefresh(): boolean {
    return this.configManager.needsTokenRefresh();
  }

  /**
   * Force token refresh
   */
  async refreshToken(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const refreshToken = this.configManager.getRefreshToken();
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      // The API client will handle the actual refresh through its interceptors
      // We just need to trigger a request that will cause the refresh
      await this.verifyToken();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get authentication headers for manual requests
   */
  getAuthHeaders(): Record<string, string> {
    return this.configManager.getApiHeaders();
  }

  /**
   * Get token expiry information
   */
  getTokenInfo(): {
    hasToken: boolean;
    expiresAt?: number;
    isExpired: boolean;
    needsRefresh: boolean;
  } {
    const config = this.configManager.config;
    
    return {
      hasToken: !!config.apiKey,
      expiresAt: config.tokenExpiresAt,
      isExpired: AuthHelpers.isTokenExpired(config.tokenExpiresAt),
      needsRefresh: AuthHelpers.needsRefresh(config.tokenExpiresAt),
    };
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    this.configManager.clearTokens();
  }

  /**
   * Export auth state for debugging
   */
  exportAuthState(): {
    isAuthenticated: boolean;
    userId?: string;
    lastLogin?: string;
    tokenInfo: ReturnType<AuthManager['getTokenInfo']>;
    authStatus: AuthStatus;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      userId: this.getCurrentUserId(),
      lastLogin: this.getLastLogin(),
      tokenInfo: this.getTokenInfo(),
      authStatus: this.getAuthStatus(),
    };
  }
}