/**
 * Authentication manager for Cliofy CLI
 * Handles user authentication, token management, and session state
 * Uses Firebase authentication exclusively
 */

import { ConfigManager } from '../config/manager';
import { APIClient } from '../api/client';
import { FirebaseAuthService, FirebaseAuthError } from '../firebase/auth';
import {
  UserProfile,
  AuthStatus,
  FirebaseAuthHelpers,
} from '../models/auth';

/**
 * Authentication manager class
 */
export class AuthManager {
  private configManager: ConfigManager;
  private apiClient: APIClient;
  private firebaseAuthService: FirebaseAuthService;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.apiClient = APIClient.getInstance(configManager);
    this.firebaseAuthService = new FirebaseAuthService();
  }

  /**
   * Login user with email and password using Firebase authentication
   */
  async login(email: string, password: string): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
  }> {
    try {
      // Validate input
      if (!FirebaseAuthHelpers.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      if (!password || password.length < 1) {
        return { success: false, error: 'Password is required' };
      }

      // Use Firebase authentication
      const authResult = await this.firebaseAuthService.authenticateWithEmailPassword(
        email,
        password,
        this.configManager.config.endpoint
      );

      // Update configuration with Firebase auth data
      this.configManager.updateFirebaseTokens(
        authResult.idToken,
        authResult.refreshToken,
        authResult.expiresIn,
        authResult.userInfo.uid,
        authResult.userInfo.email
      );

      // Convert Firebase user info to UserProfile format
      const userProfile: UserProfile = {
        id: authResult.userInfo.uid,
        email: authResult.userInfo.email,
        created_at: new Date().toISOString(), // Firebase doesn't provide created_at in auth
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        display_name: undefined,
        avatar_url: undefined,
        timezone: undefined,
        language: undefined,
      };

      return { success: true, user: userProfile };
    } catch (error) {
      if (error instanceof FirebaseAuthError) {
        return { success: false, error: error.message };
      }
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Register new user using Firebase authentication
   */
  async register(email: string, password: string): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
  }> {
    try {
      // Validate input
      if (!FirebaseAuthHelpers.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      const passwordValidation = FirebaseAuthHelpers.isValidPassword(password);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.errors.join(', ') };
      }

      // Use Firebase registration
      const authResult = await this.firebaseAuthService.registerWithEmailPassword(
        email,
        password,
        this.configManager.config.endpoint
      );

      // Update configuration with Firebase auth data
      this.configManager.updateFirebaseTokens(
        authResult.idToken,
        authResult.refreshToken,
        authResult.expiresIn,
        authResult.userInfo.uid,
        authResult.userInfo.email
      );

      // Convert Firebase user info to UserProfile format
      const userProfile: UserProfile = {
        id: authResult.userInfo.uid,
        email: authResult.userInfo.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        display_name: undefined,
        avatar_url: undefined,
        timezone: undefined,
        language: undefined,
      };

      return { success: true, user: userProfile };
    } catch (error) {
      if (error instanceof FirebaseAuthError) {
        return { success: false, error: error.message };
      }
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
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
   * Uses Firebase authentication exclusively
   */
  getAuthStatus(): AuthStatus {
    // Check if user is authenticated
    if (!this.configManager.isAuthenticated()) {
      return AuthStatus.UNAUTHENTICATED;
    }

    // Check if Firebase token needs refresh
    if (this.configManager.needsFirebaseTokenRefresh()) {
      const refreshToken = this.configManager.getFirebaseRefreshToken();
      if (!refreshToken) {
        return AuthStatus.TOKEN_EXPIRED;
      }
      return AuthStatus.TOKEN_EXPIRED;
    }

    return AuthStatus.AUTHENTICATED;
  }

  /**
   * Verify current token with the server
   * Uses Firebase ID Token verification
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

      const idToken = this.configManager.config.firebaseIdToken;
      if (!idToken) {
        return { valid: false, error: 'No Firebase ID token available' };
      }

      try {
        const userInfo = await this.firebaseAuthService.verifyIdToken(idToken);
        return {
          valid: true,
          userId: userInfo.uid,
        };
      } catch (error) {
        if (error instanceof FirebaseAuthError) {
          // Token is invalid, clear it
          this.configManager.clearFirebaseTokens();
          return {
            valid: false,
            error: error.message,
          };
        }
        throw error;
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
   * Get current user ID from Firebase config
   */
  getCurrentUserId(): string | undefined {
    return this.configManager.getFirebaseUid();
  }

  /**
   * Get last login timestamp
   */
  getLastLogin(): string | undefined {
    return this.configManager.config.lastLogin;
  }

  /**
   * Check if Firebase token needs refresh
   */
  needsTokenRefresh(): boolean {
    return this.configManager.needsFirebaseTokenRefresh();
  }

  /**
   * Force Firebase token refresh
   */
  async refreshToken(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const refreshToken = this.configManager.getFirebaseRefreshToken();
      if (!refreshToken) {
        return { success: false, error: 'No Firebase refresh token available' };
      }

      try {
        const refreshResult = await this.firebaseAuthService.refreshIdToken(refreshToken);
        
        // Update configuration with new tokens
        this.configManager.updateFirebaseTokens(
          refreshResult.idToken,
          refreshResult.refreshToken,
          refreshResult.expiresIn,
          this.configManager.getFirebaseUid()!,
          this.configManager.getUserEmail()
        );

        return { success: true };
      } catch (error) {
        if (error instanceof FirebaseAuthError) {
          // Refresh failed, clear tokens
          this.configManager.clearFirebaseTokens();
          return { success: false, error: error.message };
        }
        throw error;
      }
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
   * Get Firebase token expiry information
   */
  getTokenInfo(): {
    hasToken: boolean;
    expiresAt?: number;
    isExpired: boolean;
    needsRefresh: boolean;
    authType: 'firebase' | 'none';
  } {
    const config = this.configManager.config;
    
    if (config.firebaseIdToken) {
      return {
        hasToken: true,
        expiresAt: config.firebaseTokenExpiresAt,
        isExpired: FirebaseAuthHelpers.isTokenExpired(config.firebaseTokenExpiresAt),
        needsRefresh: FirebaseAuthHelpers.needsRefresh(config.firebaseTokenExpiresAt),
        authType: 'firebase',
      };
    }

    return {
      hasToken: false,
      isExpired: true,
      needsRefresh: false,
      authType: 'none',
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
   * Firebase authentication information
   */
  exportAuthState(): {
    isAuthenticated: boolean;
    userId?: string;
    lastLogin?: string;
    tokenInfo: ReturnType<AuthManager['getTokenInfo']>;
    authStatus: AuthStatus;
    // Firebase fields
    firebaseUid?: string;
    userEmail?: string;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      userId: this.getCurrentUserId(),
      lastLogin: this.getLastLogin(),
      tokenInfo: this.getTokenInfo(),
      authStatus: this.getAuthStatus(),
      // Firebase information
      firebaseUid: this.configManager.getFirebaseUid(),
      userEmail: this.configManager.getUserEmail(),
    };
  }

  /**
   * Get Firebase UID
   */
  getFirebaseUid(): string | undefined {
    return this.configManager.getFirebaseUid();
  }

  /**
   * Get user email from Firebase auth
   */
  getUserEmail(): string | undefined {
    return this.configManager.getUserEmail();
  }

  /**
   * Clear only Firebase authentication data
   */
  clearFirebaseAuth(): void {
    this.configManager.clearFirebaseTokens();
  }

  /**
   * Get Firebase token information
   */
  getFirebaseTokenInfo(): {
    hasToken: boolean;
    expiresAt?: number;
    isExpired: boolean;
    needsRefresh: boolean;
  } {
    const config = this.configManager.config;
    return {
      hasToken: !!config.firebaseIdToken,
      expiresAt: config.firebaseTokenExpiresAt,
      isExpired: FirebaseAuthHelpers.isTokenExpired(config.firebaseTokenExpiresAt),
      needsRefresh: FirebaseAuthHelpers.needsRefresh(config.firebaseTokenExpiresAt),
    };
  }
}