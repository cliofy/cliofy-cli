/**
 * Firebase authentication service for Cliofy CLI
 * Handles Firebase authentication operations including login, registration, and token management
 */

import axios, { AxiosError } from 'axios';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { firebaseConfig, FirebaseConfigManager } from './config';

/**
 * Firebase authentication error
 */
export class FirebaseAuthError extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'FirebaseAuthError';
    this.code = code;
  }
}

/**
 * Firebase user info interface
 */
export interface FirebaseUserInfo {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Firebase authentication result
 */
export interface FirebaseAuthResult {
  idToken: string;
  refreshToken: string;
  userInfo: FirebaseUserInfo;
  expiresIn: number;
}

/**
 * Firebase token refresh result
 */
export interface FirebaseTokenRefreshResult {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Firebase authentication service
 */
export class FirebaseAuthService {
  private configManager: FirebaseConfigManager;
  private emulatorUrl = 'http://localhost:9099';

  constructor(configManager?: FirebaseConfigManager) {
    this.configManager = configManager || firebaseConfig;
    
    // In test environment, warn about Firebase usage
    if (process.env.NODE_ENV === 'test' || process.env.CI) {
      console.warn('FirebaseAuthService: Running in test mode with limited functionality');
    }
  }

  /**
   * Call Firebase REST API (used for emulator and some operations)
   */
  private async callFirebaseRestAPI(endpoint: string, data: Record<string, any>): Promise<any> {
    const config = this.configManager.getConfig();
    
    let url: string;
    if (config.useEmulator) {
      // Use emulator endpoints with fake API key
      const baseUrl = `${this.emulatorUrl}/identitytoolkit.googleapis.com/v1`;
      url = `${baseUrl}/${endpoint}?key=fake-api-key`;
    } else {
      // Use production Firebase Auth REST API
      const baseUrl = 'https://identitytoolkit.googleapis.com/v1';
      if (!config.apiKey) {
        throw new FirebaseAuthError(
          'Production Firebase REST API requires Web API key configuration. Please set FIREBASE_API_KEY.'
        );
      }
      url = `${baseUrl}/${endpoint}?key=${config.apiKey}`;
    }

    try {
      const response = await axios.post(url, data, { timeout: 30000 });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data || {};
        const errorMessage = errorData.error?.message || 'Unknown error';
        throw new FirebaseAuthError(`Firebase API error: ${errorMessage}`, errorData.error?.code);
      }
      throw new FirebaseAuthError(`Network error: ${error}`);
    }
  }

  /**
   * Authenticate user with email and password via Firebase and backend API
   */
  async authenticateWithEmailPassword(
    email: string,
    password: string,
    backendUrl: string = 'http://localhost:5173'
  ): Promise<FirebaseAuthResult> {
    const config = this.configManager.getConfig();

    if (config.useEmulator) {
      // Use Firebase Auth REST API for emulator
      const requestData = {
        email,
        password,
        returnSecureToken: true,
      };

      const firebaseResult = await this.callFirebaseRestAPI('accounts:signInWithPassword', requestData);

      const userInfo: FirebaseUserInfo = {
        uid: firebaseResult.localId,
        email: firebaseResult.email,
        emailVerified: firebaseResult.emailVerified || false,
      };

      // Call backend API to register/login the user
      await this.syncUserWithBackend(firebaseResult.idToken, userInfo, backendUrl);

      return {
        idToken: firebaseResult.idToken,
        refreshToken: firebaseResult.refreshToken,
        userInfo,
        expiresIn: 3600, // Firebase ID tokens expire in 1 hour
      };
    } else {
      // For production, use Firebase Client SDK
      try {
        const auth = this.configManager.getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();

        const userInfo: FirebaseUserInfo = {
          uid: userCredential.user.uid,
          email: userCredential.user.email!,
          emailVerified: userCredential.user.emailVerified,
        };

        // Call backend API to sync user
        await this.syncUserWithBackend(idToken, userInfo, backendUrl);

        return {
          idToken,
          refreshToken: userCredential.user.refreshToken,
          userInfo,
          expiresIn: 3600,
        };
      } catch (error: any) {
        throw new FirebaseAuthError(
          this.mapFirebaseErrorMessage(error.code || error.message),
          error.code
        );
      }
    }
  }

  /**
   * Register new user with email and password via Firebase and backend API
   */
  async registerWithEmailPassword(
    email: string,
    password: string,
    backendUrl: string = 'http://localhost:5173'
  ): Promise<FirebaseAuthResult> {
    const config = this.configManager.getConfig();

    if (config.useEmulator) {
      // Use Firebase Auth REST API for emulator
      const requestData = {
        email,
        password,
        returnSecureToken: true,
      };

      const firebaseResult = await this.callFirebaseRestAPI('accounts:signUp', requestData);

      const userInfo: FirebaseUserInfo = {
        uid: firebaseResult.localId,
        email: firebaseResult.email,
        emailVerified: firebaseResult.emailVerified || false,
      };

      // Call backend API to register the user
      await this.syncUserWithBackend(firebaseResult.idToken, userInfo, backendUrl);

      return {
        idToken: firebaseResult.idToken,
        refreshToken: firebaseResult.refreshToken,
        userInfo,
        expiresIn: 3600,
      };
    } else {
      // For production, use Firebase Client SDK
      try {
        const auth = this.configManager.getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();

        const userInfo: FirebaseUserInfo = {
          uid: userCredential.user.uid,
          email: userCredential.user.email!,
          emailVerified: userCredential.user.emailVerified,
        };

        // Call backend API to sync user
        await this.syncUserWithBackend(idToken, userInfo, backendUrl);

        return {
          idToken,
          refreshToken: userCredential.user.refreshToken,
          userInfo,
          expiresIn: 3600,
        };
      } catch (error: any) {
        throw new FirebaseAuthError(
          this.mapFirebaseErrorMessage(error.code || error.message),
          error.code
        );
      }
    }
  }

  /**
   * Refresh Firebase ID token using refresh token
   */
  async refreshIdToken(refreshToken: string): Promise<FirebaseTokenRefreshResult> {
    const config = this.configManager.getConfig();

    const requestData = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    let url: string;
    if (config.useEmulator) {
      url = `${this.emulatorUrl}/securetoken.googleapis.com/v1/token?key=fake-api-key`;
    } else {
      url = 'https://securetoken.googleapis.com/v1/token';
    }

    try {
      const response = await axios.post(url, requestData, { timeout: 30000 });
      const result = response.data;

      return {
        idToken: result.id_token,
        refreshToken: result.refresh_token,
        expiresIn: parseInt(result.expires_in) || 3600,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new FirebaseAuthError('Failed to refresh token');
      }
      throw new FirebaseAuthError(`Network error during token refresh: ${error}`);
    }
  }

  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(idToken: string): Promise<FirebaseUserInfo> {
    // For verification, we'll make a test request to the backend
    // The backend will verify the token using Firebase Admin SDK
    try {
      const response = await axios.post(
        'http://localhost:5173/api/auth/verify',
        { idToken },
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const result = response.data;
      if (result.success && result.user) {
        return {
          uid: result.user.uid,
          email: result.user.email,
          emailVerified: result.user.email_verified || false,
        };
      } else {
        throw new FirebaseAuthError('Token verification failed', 'INVALID_TOKEN');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new FirebaseAuthError('ID token has expired or is invalid', 'TOKEN_EXPIRED');
        }
      }
      throw new FirebaseAuthError(`Token verification failed: ${error}`);
    }
  }

  /**
   * Sync user with backend API
   */
  private async syncUserWithBackend(
    idToken: string,
    userInfo: FirebaseUserInfo,
    backendUrl: string
  ): Promise<void> {
    const backendData = {
      firebaseToken: idToken,
      user: userInfo,
    };

    try {
      const response = await axios.post(
        `${backendUrl.replace(/\/$/, '')}/api/auth/firebase-login`,
        backendData,
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.status !== 200) {
        throw new FirebaseAuthError('Backend authentication failed');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data || {};
        const errorMsg = errorData.error || 'Backend authentication failed';
        throw new FirebaseAuthError(`Backend authentication failed: ${errorMsg}`);
      }
      throw new FirebaseAuthError(`Failed to communicate with backend: ${error}`);
    }
  }

  /**
   * Map Firebase error codes to user-friendly messages
   */
  private mapFirebaseErrorMessage(errorCode: string): string {
    const errorMap: Record<string, string> = {
      'auth/invalid-email': 'Invalid email format',
      'auth/user-disabled': 'User account has been disabled',
      'auth/user-not-found': 'Invalid email or password',
      'auth/wrong-password': 'Invalid email or password',
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/weak-password': 'Password is too weak. Please choose a stronger password',
      'auth/invalid-credential': 'Invalid email or password',
      'INVALID_PASSWORD': 'Invalid email or password',
      'EMAIL_NOT_FOUND': 'Invalid email or password',
      'USER_DISABLED': 'User account has been disabled',
      'EMAIL_EXISTS': 'An account with this email already exists',
      'WEAK_PASSWORD': 'Password is too weak. Please choose a stronger password',
      'INVALID_EMAIL': 'Invalid email format',
    };

    return errorMap[errorCode] || `Authentication failed: ${errorCode}`;
  }
}

// Global Firebase auth service instance
export const firebaseAuthService = new FirebaseAuthService();