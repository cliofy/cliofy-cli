/**
 * Authentication-related data models and schemas
 */

import { z } from 'zod';

// Export schemas for runtime use
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  created_at: z.string(),
  last_sign_in_at: z.string().optional(),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  expires_at: z.string().optional(),
  user: UserSchema,
});

export const RegisterResponseSchema = z.object({
  user: UserSchema,
  message: z.string().optional(),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
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
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
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