/**
 * Firebase module exports
 * Centralized export for all Firebase-related functionality
 */

export { FirebaseConfigManager, firebaseConfig } from './config';
export { FirebaseAuthService, FirebaseAuthError, firebaseAuthService } from './auth';
export type {
  FirebaseUserInfo,
  FirebaseAuthResult,
  FirebaseTokenRefreshResult,
} from './auth';

export type {
  FirebaseConfig,
} from './config';