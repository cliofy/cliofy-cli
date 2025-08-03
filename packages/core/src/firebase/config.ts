/**
 * Firebase configuration management for Cliofy CLI
 * Handles Firebase app initialization and configuration
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';

/**
 * Firebase configuration interface
 */
export interface FirebaseConfig {
  projectId: string;
  apiKey?: string;
  authDomain?: string;
  useEmulator: boolean;
}

/**
 * Firebase configuration manager
 */
export class FirebaseConfigManager {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private config: FirebaseConfig;

  constructor() {
    try {
      this.config = this.loadFromEnv();
    } catch (error) {
      // In test environment or when Firebase is not configured, use default config
      if (process.env.NODE_ENV === 'test' || process.env.CI) {
        console.warn('Firebase not configured, using default test config');
        this.config = {
          projectId: 'test-project',
          apiKey: 'test-api-key',
          authDomain: 'test-project.firebaseapp.com',
          useEmulator: true,
        };
      } else {
        throw error;
      }
    }
  }

  /**
   * Load Firebase configuration from environment variables
   */
  private loadFromEnv(): FirebaseConfig {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const apiKey = process.env.FIREBASE_API_KEY;
    const authDomain = process.env.FIREBASE_AUTH_DOMAIN;
    const useEmulator = process.env.FIREBASE_USE_EMULATOR?.toLowerCase() === 'true';

    if (!projectId) {
      throw new Error(
        'Firebase configuration missing. Please set FIREBASE_PROJECT_ID environment variable.'
      );
    }

    return {
      projectId,
      apiKey,
      authDomain,
      useEmulator,
    };
  }

  /**
   * Check if Firebase is properly configured
   */
  isConfigured(): boolean {
    if (this.config.useEmulator) {
      // For emulator, only project ID is required
      return !!this.config.projectId;
    }

    // For production, we need project ID and API key
    return !!(this.config.projectId && this.config.apiKey);
  }

  /**
   * Get or create Firebase app instance
   */
  getApp(): FirebaseApp {
    if (this.app) {
      return this.app;
    }

    if (!this.isConfigured()) {
      throw new Error(
        'Firebase is not properly configured. Please set the required environment variables:\n' +
        '- FIREBASE_PROJECT_ID (required)\n' +
        '- FIREBASE_API_KEY (production only)\n' +
        '- FIREBASE_AUTH_DOMAIN (production only)\n' +
        '- FIREBASE_USE_EMULATOR (optional, set to "true" for development)'
      );
    }

    const firebaseConfig = {
      projectId: this.config.projectId,
      ...(this.config.apiKey && { apiKey: this.config.apiKey }),
      ...(this.config.authDomain && { authDomain: this.config.authDomain }),
    };

    this.app = initializeApp(firebaseConfig);
    return this.app;
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth(): Auth {
    if (this.auth) {
      return this.auth;
    }

    const app = this.getApp();
    this.auth = getAuth(app);

    // Connect to emulator if enabled
    if (this.config.useEmulator) {
      try {
        connectAuthEmulator(this.auth, 'http://localhost:9099', { disableWarnings: true });
      } catch (error) {
        // Emulator might already be connected, ignore error
        console.warn('Firebase Auth emulator connection warning:', error);
      }
    }

    return this.auth;
  }

  /**
   * Get emulator auth URL
   */
  getEmulatorAuthUrl(): string {
    if (!this.config.useEmulator) {
      throw new Error('Emulator is not enabled');
    }
    return 'http://localhost:9099';
  }

  /**
   * Get current configuration
   */
  getConfig(): FirebaseConfig {
    return { ...this.config };
  }

  /**
   * Reload configuration from environment variables
   */
  reloadFromEnv(): void {
    this.config = this.loadFromEnv();
    // Clear instances to force recreation with new config
    this.app = null;
    this.auth = null;
  }

  /**
   * Check if using emulator
   */
  isUsingEmulator(): boolean {
    return this.config.useEmulator;
  }
}

// Global Firebase config instance
export const firebaseConfig = new FirebaseConfigManager();