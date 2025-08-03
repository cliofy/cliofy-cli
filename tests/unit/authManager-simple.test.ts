/**
 * Simple AuthManager unit tests that match actual implementation
 */

import { ConfigManager } from '../../packages/core/src/config/manager';
import { APIClient } from '../../packages/core/src/api/client';
import { DEFAULT_CONFIG } from '../../packages/core/src/config/types';

// Mock dependencies
jest.mock('../../packages/core/src/config/manager');
jest.mock('../../packages/core/src/api/client');

const MockedConfigManager = ConfigManager as jest.MockedClass<typeof ConfigManager>;
const MockedAPIClient = APIClient as jest.MockedClass<typeof APIClient>;

describe('AuthManager Simple Tests', () => {
  let AuthManager: any;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockApiClient: jest.Mocked<APIClient>;

  beforeAll(async () => {
    // Dynamic import to avoid circular dependencies
    const authModule = await import('../../packages/core/src/auth/manager');
    AuthManager = authModule.AuthManager;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock config manager
    mockConfigManager = new MockedConfigManager() as jest.Mocked<ConfigManager>;
    
    // Mock config property with getter
    Object.defineProperty(mockConfigManager, 'config', {
      get: jest.fn(() => ({
        endpoint: DEFAULT_CONFIG.endpoint,
        timeout: DEFAULT_CONFIG.timeout,
        firebaseIdToken: undefined,
        firebaseUid: undefined,
        userEmail: undefined
      })),
      configurable: true
    });
    
    mockConfigManager.isAuthenticated = jest.fn().mockReturnValue(false);
    mockConfigManager.updateFirebaseTokens = jest.fn();
    mockConfigManager.updateConfig = jest.fn();
    mockConfigManager.clearTokens = jest.fn();
    mockConfigManager.getFirebaseUid = jest.fn();
    mockConfigManager.getUserEmail = jest.fn();
    
    // Setup mock API client
    mockApiClient = {
      firebaseLogin: jest.fn(),
      verifyToken: jest.fn(),
      getUserProfile: jest.fn()
    } as any;
    
    // Mock getInstance to return our mock
    MockedAPIClient.getInstance = jest.fn().mockReturnValue(mockApiClient);
  });

  describe('Basic Authentication', () => {
    it('should create AuthManager instance', () => {
      const authManager = new AuthManager(mockConfigManager);
      
      expect(authManager).toBeInstanceOf(AuthManager);
      expect(MockedAPIClient.getInstance).toHaveBeenCalledWith(mockConfigManager);
    });

    it('should handle successful login', async () => {
      // Mock Firebase auth service response
      const mockFirebaseAuthService = {
        authenticateWithEmailPassword: jest.fn().mockResolvedValue({
          idToken: 'mock-firebase-id-token',
          refreshToken: 'mock-firebase-refresh-token',
          expiresIn: 3600,
          userInfo: {
            uid: 'user-123',
            email: 'test@example.com',
            emailVerified: true
          }
        })
      };
      
      // Mock the Firebase auth service in AuthManager
      jest.doMock('../../packages/core/src/firebase/auth', () => ({
        FirebaseAuthService: jest.fn(() => mockFirebaseAuthService)
      }));
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.login('test@example.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(mockConfigManager.updateFirebaseTokens).toHaveBeenCalledWith(
        'mock-firebase-id-token',
        'mock-firebase-refresh-token',
        3600,
        'user-123',
        'test@example.com'
      );
    });

    it('should handle login failure', async () => {
      const loginError = new Error('Invalid credentials');
      mockApiClient.login.mockRejectedValue(loginError);
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.login('invalid@example.com', 'wrong');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(mockConfigManager.updateTokens).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.login('invalid-email', 'password');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
      expect(mockApiClient.login).not.toHaveBeenCalled();
    });

    it('should validate password presence', async () => {
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.login('test@example.com', '');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password is required');
      expect(mockApiClient.login).not.toHaveBeenCalled();
    });
  });

  describe('User Registration', () => {
    it('should handle successful registration', async () => {
      const mockRegisterResponse = {
        user: {
          id: 'new-user-123',
          email: 'new@example.com',
          created_at: '2024-01-01T00:00:00Z'
        }
      };
      
      mockApiClient.register.mockResolvedValue(mockRegisterResponse);
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.register('new@example.com', 'Password123');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('new@example.com');
      expect(mockApiClient.register).toHaveBeenCalledWith('new@example.com', 'Password123');
    });

    it('should handle registration failure', async () => {
      const registerError = new Error('Email already exists');
      mockApiClient.register.mockRejectedValue(registerError);
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.register('existing@example.com', 'Password123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });

    it('should validate email for registration', async () => {
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.register('invalid-email', 'Password123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
      expect(mockApiClient.register).not.toHaveBeenCalled();
    });
  });

  describe('Authentication State', () => {
    it('should check if user is authenticated', () => {
      mockConfigManager.isAuthenticated.mockReturnValue(true);
      
      const authManager = new AuthManager(mockConfigManager);
      const isAuth = authManager.isAuthenticated();
      
      expect(isAuth).toBe(true);
      expect(mockConfigManager.isAuthenticated).toHaveBeenCalled();
    });

    it('should check if user is not authenticated', () => {
      mockConfigManager.isAuthenticated.mockReturnValue(false);
      
      const authManager = new AuthManager(mockConfigManager);
      const isAuth = authManager.isAuthenticated();
      
      expect(isAuth).toBe(false);
      expect(mockConfigManager.isAuthenticated).toHaveBeenCalled();
    });

    it('should logout user', () => {
      const authManager = new AuthManager(mockConfigManager);
      authManager.logout();
      
      expect(mockConfigManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Token Verification', () => {
    it('should handle successful token verification', async () => {
      mockConfigManager.isAuthenticated.mockReturnValue(true);
      const mockVerifyResponse = {
        valid: true,
        user_id: 'user-123'
      };
      mockApiClient.verifyToken.mockResolvedValue(mockVerifyResponse);
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.verifyToken();
      
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockApiClient.verifyToken).toHaveBeenCalled();
    });

    it('should handle token verification failure', async () => {
      mockConfigManager.isAuthenticated.mockReturnValue(true);
      const mockVerifyResponse = {
        valid: false,
        error: 'Token expired'
      };
      mockApiClient.verifyToken.mockResolvedValue(mockVerifyResponse);
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.verifyToken();
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(mockConfigManager.clearTokens).toHaveBeenCalled();
    });

    it('should handle verification when not authenticated', async () => {
      mockConfigManager.isAuthenticated.mockReturnValue(false);
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.verifyToken();
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not authenticated');
      expect(mockApiClient.verifyToken).not.toHaveBeenCalled();
    });
  });

  describe('User Profile', () => {
    it('should get current user when authenticated', async () => {
      mockConfigManager.isAuthenticated.mockReturnValue(true);
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      mockApiClient.getUserProfile.mockResolvedValue(mockProfile);
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.getCurrentUser();
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(mockApiClient.getUserProfile).toHaveBeenCalled();
    });

    it('should handle profile fetch when not authenticated', async () => {
      mockConfigManager.isAuthenticated.mockReturnValue(false);
      
      const authManager = new AuthManager(mockConfigManager);
      const result = await authManager.getCurrentUser();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
      expect(mockApiClient.getUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should get current user ID', () => {
      Object.defineProperty(mockConfigManager, 'config', {
        get: jest.fn(() => ({
          userId: 'current-user-123'
        })),
        configurable: true
      });
      
      const authManager = new AuthManager(mockConfigManager);
      const userId = authManager.getCurrentUserId();
      
      expect(userId).toBe('current-user-123');
    });

    it('should get auth headers', () => {
      const mockHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token-123'
      };
      mockConfigManager.getApiHeaders = jest.fn().mockReturnValue(mockHeaders);
      
      const authManager = new AuthManager(mockConfigManager);
      const headers = authManager.getAuthHeaders();
      
      expect(headers).toEqual(mockHeaders);
      expect(mockConfigManager.getApiHeaders).toHaveBeenCalled();
    });

    it('should clear authentication', () => {
      const authManager = new AuthManager(mockConfigManager);
      authManager.clearAuth();
      
      expect(mockConfigManager.clearTokens).toHaveBeenCalled();
    });
  });
});