/**
 * Authentication-related data models and schemas
 * Uses Firebase authentication exclusively
 */

import { z } from 'zod';

// User schema for compatibility
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  last_sign_in_at: z.string().optional(),
});

export const AuthVerifyResponseSchema = z.object({
  valid: z.boolean(),
  user_id: z.string().optional(),
  exp: z.number().optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  display_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  last_sign_in_at: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export const UserProfileResponseSchema = z.object({
  profile: UserProfileSchema,
});

export const UpdateProfileRequestSchema = z.object({
  display_name: z.string().max(100).optional(),
  avatar_url: z.string().url().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export const AuthErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  status_code: z.number().int().optional(),
});

// Type definitions
export type User = z.infer<typeof UserSchema>;
export type AuthVerifyResponse = z.infer<typeof AuthVerifyResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type AuthError = z.infer<typeof AuthErrorSchema>;

/**
 * Authentication status enum
 */
export enum AuthStatus {
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  TOKEN_EXPIRED = 'token_expired',
  TOKEN_INVALID = 'token_invalid',
  REFRESHING = 'refreshing',
}

/**
 * Authentication helpers
 */
export const AuthHelpers = {
  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt?: number): boolean {
    if (!expiresAt) return true;
    return Date.now() >= expiresAt;
  },

  /**
   * Check if token needs refresh (expires in less than 5 minutes)
   */
  needsRefresh(expiresAt?: number): boolean {
    if (!expiresAt) return true;
    const bufferTime = 5 * 60 * 1000; // 5 minutes in ms
    return Date.now() >= (expiresAt - bufferTime);
  },

  /**
   * Parse JWT token (unsafe, for debugging only)
   */
  parseJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  },

  /**
   * Get token expiry from JWT
   */
  getTokenExpiry(token: string): number | null {
    const payload = this.parseJWT(token);
    return payload?.exp ? payload.exp * 1000 : null; // Convert to ms
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   */
  isValidPassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// Firebase-specific schemas and types

/**
 * Firebase user info schema
 */
export const FirebaseUserInfoSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
});

/**
 * Firebase authentication request schema
 */
export const FirebaseLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Firebase authentication response schema
 */
export const FirebaseAuthResponseSchema = z.object({
  idToken: z.string(),
  refreshToken: z.string(),
  userInfo: FirebaseUserInfoSchema,
  expiresIn: z.number().int().positive(),
});

/**
 * Firebase token refresh request schema
 */
export const FirebaseRefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

/**
 * Firebase token refresh response schema
 */
export const FirebaseRefreshTokenResponseSchema = z.object({
  idToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});

/**
 * Firebase backend login request schema
 */
export const FirebaseBackendLoginRequestSchema = z.object({
  firebaseToken: z.string(),
  user: FirebaseUserInfoSchema,
});

/**
 * Firebase backend login response schema
 */
export const FirebaseBackendLoginResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    uid: z.string(),
    email: z.string(),
    name: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});

// Firebase type definitions
export type FirebaseUserInfo = z.infer<typeof FirebaseUserInfoSchema>;
export type FirebaseLoginRequest = z.infer<typeof FirebaseLoginRequestSchema>;
export type FirebaseAuthResponse = z.infer<typeof FirebaseAuthResponseSchema>;
export type FirebaseRefreshTokenRequest = z.infer<typeof FirebaseRefreshTokenRequestSchema>;
export type FirebaseRefreshTokenResponse = z.infer<typeof FirebaseRefreshTokenResponseSchema>;
export type FirebaseBackendLoginRequest = z.infer<typeof FirebaseBackendLoginRequestSchema>;
export type FirebaseBackendLoginResponse = z.infer<typeof FirebaseBackendLoginResponseSchema>;

/**
 * Extended AuthHelpers with Firebase support
 */
export const FirebaseAuthHelpers = {
  ...AuthHelpers,

  /**
   * Check if using Firebase authentication
   */
  isFirebaseAuth(token?: string): boolean {
    if (!token) return false;
    // Firebase ID tokens are typically longer and have a different structure
    // This is a simple heuristic check
    return token.length > 500 && token.split('.').length === 3;
  },

  /**
   * Get Firebase token expiry (Firebase tokens have exp in seconds)
   */
  getFirebaseTokenExpiry(idToken: string): number | null {
    const payload = this.parseJWT(idToken);
    return payload?.exp ? payload.exp * 1000 : null; // Convert to ms
  },

  /**
   * Check if Firebase token is expired
   */
  isFirebaseTokenExpired(idToken: string): boolean {
    const expiresAt = this.getFirebaseTokenExpiry(idToken);
    return this.isTokenExpired(expiresAt ?? undefined);
  },

  /**
   * Check if Firebase token needs refresh
   */
  firebaseNeedsRefresh(idToken: string): boolean {
    const expiresAt = this.getFirebaseTokenExpiry(idToken);
    return this.needsRefresh(expiresAt ?? undefined);
  },
};