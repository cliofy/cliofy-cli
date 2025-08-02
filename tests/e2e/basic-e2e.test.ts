/**
 * Basic End-to-end tests for CLI workflows
 * These tests focus on component integration without requiring external servers
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../../packages/core/src/config/manager';
import { APIClient } from '../../packages/core/src/api/client';
import { AuthManager } from '../../packages/core/src/auth/manager';

describe('Basic E2E Tests', () => {
  let tempConfigDir: string;
  let configManager: ConfigManager;
  let apiClient: APIClient;
  let authManager: AuthManager;

  beforeEach(() => {
    // Create temp directory for config
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cliofy-e2e-'));
    
    // Reset APIClient singleton
    APIClient.reset();
    
    // Initialize components
    configManager = new ConfigManager(tempConfigDir);
    apiClient = APIClient.getInstance(configManager);
    authManager = new AuthManager(configManager);
  });

  afterEach(() => {
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true, force: true });
    }
  });

  describe('Configuration Management E2E', () => {
    it('should handle complete configuration lifecycle', () => {
      // 1. Initial state
      expect(configManager.isAuthenticated()).toBe(false);
      
      // 2. Load default config
      const initialConfig = configManager.loadConfig();
      expect(initialConfig.endpoint).toBe('http://localhost:5173');
      expect(initialConfig.timeout).toBe(30000);
      
      // 3. Update configuration
      const newConfig = {
        endpoint: 'http://test.example.com',
        timeout: 45000,
        apiKey: 'test-api-key',
        userId: 'test-user-123'
      };
      
      configManager.saveConfig(newConfig);
      
      // 4. Reload and verify
      const reloadedConfig = configManager.loadConfig();
      expect(reloadedConfig.endpoint).toBe('http://test.example.com');
      expect(reloadedConfig.timeout).toBe(45000);
      expect(reloadedConfig.apiKey).toBe('test-api-key');
      expect(reloadedConfig.userId).toBe('test-user-123');
      
      // 5. Check authentication state
      expect(configManager.isAuthenticated()).toBe(true);
    });

    it('should handle token management lifecycle', () => {
      // 1. Initial state - no tokens, so refresh check returns false
      expect(configManager.needsTokenRefresh()).toBe(false);
      
      // 2. Update tokens
      const accessToken = 'new-access-token';
      const refreshToken = 'new-refresh-token';
      const expiresIn = 3600;
      
      configManager.updateTokens(accessToken, refreshToken, expiresIn);
      configManager.updateConfig({ userId: 'test-user' }); // Need userId for authentication
      
      // 3. Check token state
      expect(configManager.needsTokenRefresh()).toBe(false);
      expect(configManager.isAuthenticated()).toBe(true);
      
      // 4. Clear tokens
      configManager.clearTokens();
      
      // 5. Verify cleared state
      expect(configManager.isAuthenticated()).toBe(false);
      expect(configManager.needsTokenRefresh()).toBe(false); // No token = no refresh needed
    });

    it('should provide correct API headers based on authentication state', () => {
      // 1. No authentication
      let headers = configManager.getApiHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('cliofy-cli/0.1.0');
      expect(headers.Authorization).toBeUndefined();
      
      // 2. With authentication
      configManager.updateTokens('test-token', 'refresh-token', 3600);
      headers = configManager.getApiHeaders();
      expect(headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('Component Integration E2E', () => {
    it('should integrate ConfigManager with APIClient', () => {
      // 1. Configure endpoint
      configManager.saveConfig({
        endpoint: 'http://test-api.example.com',
        timeout: 30000
      });
      
      // 2. Check APIClient uses correct endpoint
      expect(apiClient.getBaseURL()).toBe('http://test-api.example.com');
      
      // 3. Update endpoint
      configManager.saveConfig({
        endpoint: 'http://updated-api.example.com',
        timeout: 30000
      });
      
      // Note: APIClient endpoint doesn't update automatically in current implementation
      // This test documents the current behavior - APIClient gets updated config
      expect(apiClient.getBaseURL()).toBe('http://updated-api.example.com');
    });

    it('should integrate ConfigManager with AuthManager', () => {
      // 1. Initial state
      expect(authManager.isAuthenticated()).toBe(false);
      
      // 2. Simulate authentication via configuration
      configManager.updateTokens('auth-token', 'refresh-token', 3600);
      configManager.updateConfig({ userId: 'user-123' });
      
      // 3. Check AuthManager reflects authentication state
      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getCurrentUserId()).toBe('user-123');
      
      // 4. Check auth headers
      const headers = authManager.getAuthHeaders();
      expect(headers.Authorization).toBe('Bearer auth-token');
      
      // 5. Clear authentication
      authManager.clearAuth();
      expect(authManager.isAuthenticated()).toBe(false);
    });
  });

  describe('Error Handling E2E', () => {
    it('should handle configuration file corruption gracefully', () => {
      // 1. Create corrupted config file
      const configPath = path.join(tempConfigDir, 'config.json');
      fs.writeFileSync(configPath, 'invalid json content');
      
      // 2. ConfigManager should handle corruption gracefully
      const config = configManager.loadConfig();
      expect(config.endpoint).toBe('http://localhost:5173'); // Default fallback
    });

    it('should handle missing configuration directory', () => {
      // 1. Use non-existent directory
      const nonExistentDir = path.join(tempConfigDir, 'nonexistent');
      const newConfigManager = new ConfigManager(nonExistentDir);
      
      // 2. Should create directory and work normally
      const config = newConfigManager.loadConfig();
      expect(config.endpoint).toBe('http://localhost:5173');
      
      // 3. Directory should be created
      expect(fs.existsSync(nonExistentDir)).toBe(true);
    });

    it('should handle authentication validation edge cases', () => {
      // 1. Test email validation
      expect(authManager.isAuthenticated()).toBe(false);
      
      // 2. Invalid email should be caught before API call
      const invalidEmailResult = authManager.login('invalid-email', 'Password123');
      expect(invalidEmailResult).resolves.toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid email format')
      });
      
      // 3. Empty password should be caught
      const emptyPasswordResult = authManager.login('test@example.com', '');
      expect(emptyPasswordResult).resolves.toMatchObject({
        success: false,
        error: expect.stringContaining('Password is required')
      });
      
      // 4. Weak password for registration
      const weakPasswordResult = authManager.register('test@example.com', 'weak');
      expect(weakPasswordResult).resolves.toMatchObject({
        success: false,
        error: expect.stringContaining('Password must')
      });
    });
  });

  describe('File System Integration E2E', () => {
    it('should handle concurrent configuration access', () => {
      // 1. Create initial config
      const config1 = { endpoint: 'http://api1.com', timeout: 30000 };
      configManager.saveConfig(config1);
      
      // 2. Create second ConfigManager for same directory
      const configManager2 = new ConfigManager(tempConfigDir);
      
      // 3. Both should read the same configuration
      const loaded1 = configManager.loadConfig();
      const loaded2 = configManager2.loadConfig();
      
      expect(loaded1.endpoint).toBe(loaded2.endpoint);
      expect(loaded1.timeout).toBe(loaded2.timeout);
    });

    it('should handle configuration paths correctly', () => {
      const paths = configManager.getPaths();
      
      expect(paths.configPath).toContain('config.json');
      expect(paths.sessionPath).toContain('session.json');
      expect(paths.logsPath).toContain('logs');
      
      // All paths should be within temp directory
      expect(paths.configPath).toContain(tempConfigDir);
      expect(paths.sessionPath).toContain(tempConfigDir);
      expect(paths.logsPath).toContain(tempConfigDir);
    });
  });
});