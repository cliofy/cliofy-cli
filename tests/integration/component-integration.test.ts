/**
 * Component Integration Tests
 * Tests integration between ConfigManager, AuthManager, and other components
 * without relying on HTTP mocking
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../../packages/core/src/config/manager';
import { APIClient } from '../../packages/core/src/api/client';
import { AuthManager } from '../../packages/core/src/auth/manager';

describe('Component Integration Tests', () => {
  let tempConfigDir: string;
  let configManager: ConfigManager;
  let apiClient: APIClient;
  let authManager: AuthManager;

  beforeEach(() => {
    // Create temp directory for config
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cliofy-integration-'));
    
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

  describe('ConfigManager and AuthManager Integration', () => {
    it('should sync authentication state between components', () => {
      // 1. Initial state - both should report not authenticated
      expect(configManager.isAuthenticated()).toBe(false);
      expect(authManager.isAuthenticated()).toBe(false);
      
      // 2. Update tokens via ConfigManager
      configManager.updateTokens('access-token', 'refresh-token', 3600);
      configManager.updateConfig({ userId: 'user-123' });
      
      // 3. Both should now report authenticated
      expect(configManager.isAuthenticated()).toBe(true);
      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getCurrentUserId()).toBe('user-123');
      
      // 4. Clear via AuthManager
      authManager.clearAuth();
      
      // 5. Both should report not authenticated
      expect(configManager.isAuthenticated()).toBe(false);
      expect(authManager.isAuthenticated()).toBe(false);
    });

    it('should share configuration changes between components', () => {
      // 1. Set configuration via ConfigManager
      const newConfig = {
        endpoint: 'http://custom.api.com',
        timeout: 45000,
        apiKey: 'test-key',
        userId: 'test-user'
      };
      
      configManager.saveConfig(newConfig);
      
      // 2. AuthManager should see the changes
      expect(authManager.getCurrentUserId()).toBe('test-user');
      expect(authManager.isAuthenticated()).toBe(true);
      
      // 3. API headers should reflect the changes
      const headers = authManager.getAuthHeaders();
      expect(headers.Authorization).toBe('Bearer test-key');
    });
  });

  describe('ConfigManager and APIClient Integration', () => {
    it('should use ConfigManager settings in APIClient', () => {
      // 1. Set custom endpoint
      configManager.saveConfig({
        endpoint: 'http://integration-test.com',
        timeout: 60000
      });
      
      // 2. APIClient should use the endpoint
      expect(apiClient.getBaseURL()).toBe('http://integration-test.com');
    });

    it('should handle configuration reload scenarios', () => {
      // 1. Initial configuration
      configManager.saveConfig({
        endpoint: 'http://initial.com',
        timeout: 30000
      });
      
      expect(apiClient.getBaseURL()).toBe('http://initial.com');
      
      // 2. Create new ConfigManager for same directory (simulating restart)
      const configManager2 = new ConfigManager(tempConfigDir);
      const loadedConfig = configManager2.loadConfig();
      
      expect(loadedConfig.endpoint).toBe('http://initial.com');
      expect(loadedConfig.timeout).toBe(30000);
    });
  });

  describe('Full Authentication Workflow Integration', () => {
    it('should handle complete authentication lifecycle', () => {
      // 1. Initial state
      expect(authManager.isAuthenticated()).toBe(false);
      expect(configManager.isAuthenticated()).toBe(false);
      
      // 2. Simulate successful authentication by updating config
      // (This simulates what would happen after a successful API login)
      configManager.updateTokens('jwt-token', 'refresh-token', 3600);
      configManager.updateConfig({ 
        userId: 'authenticated-user',
        lastLogin: new Date().toISOString()
      });
      
      // 3. All components should reflect authenticated state
      expect(authManager.isAuthenticated()).toBe(true);
      expect(configManager.isAuthenticated()).toBe(true);
      expect(authManager.getCurrentUserId()).toBe('authenticated-user');
      
      // 4. Auth headers should be available
      const headers = authManager.getAuthHeaders();
      expect(headers.Authorization).toBe('Bearer jwt-token');
      expect(headers['Content-Type']).toBe('application/json');
      
      // 5. Logout should clear everything
      authManager.logout();
      
      expect(authManager.isAuthenticated()).toBe(false);
      expect(configManager.isAuthenticated()).toBe(false);
    });

    it('should persist authentication across component recreation', () => {
      // 1. Authenticate with first set of components
      configManager.updateTokens('persistent-token', 'persistent-refresh', 3600);
      configManager.updateConfig({ userId: 'persistent-user' });
      
      expect(authManager.isAuthenticated()).toBe(true);
      
      // 2. Create new components using same config directory
      const configManager2 = new ConfigManager(tempConfigDir);
      APIClient.reset();
      const apiClient2 = APIClient.getInstance(configManager2);
      const authManager2 = new AuthManager(configManager2);
      
      // 3. New components should see persisted authentication
      expect(authManager2.isAuthenticated()).toBe(true);
      expect(authManager2.getCurrentUserId()).toBe('persistent-user');
      expect(apiClient2.getBaseURL()).toBe('http://localhost:5173'); // Default endpoint
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle configuration corruption gracefully across components', () => {
      // 1. Create corrupted config file
      const configPath = path.join(tempConfigDir, 'config.json');
      fs.writeFileSync(configPath, '{"invalid": json}');
      
      // 2. Create new components that will read corrupted config
      const configManager2 = new ConfigManager(tempConfigDir);
      APIClient.reset();
      const apiClient2 = APIClient.getInstance(configManager2);
      const authManager2 = new AuthManager(configManager2);
      
      // 3. All components should handle corruption gracefully
      expect(authManager2.isAuthenticated()).toBe(false);
      expect(apiClient2.getBaseURL()).toBe('http://localhost:5173'); // Default
      
      // 4. Should be able to recover by saving new config
      configManager2.saveConfig({
        endpoint: 'http://recovered.com',
        timeout: 30000
      });
      
      const recoveredConfig = configManager2.loadConfig();
      expect(recoveredConfig.endpoint).toBe('http://recovered.com');
    });

    it('should handle concurrent access to configuration', () => {
      // 1. Create two ConfigManagers for same directory
      const configManager1 = new ConfigManager(tempConfigDir);
      const configManager2 = new ConfigManager(tempConfigDir);
      
      // 2. Both should start with default config
      const config1 = configManager1.loadConfig();
      const config2 = configManager2.loadConfig();
      
      expect(config1.endpoint).toBe(config2.endpoint);
      
      // 3. Save config with first manager
      configManager1.saveConfig({
        endpoint: 'http://manager1.com',
        timeout: 30000
      });
      
      // 4. Second manager should see changes after reload
      const reloadedConfig2 = configManager2.loadConfig();
      expect(reloadedConfig2.endpoint).toBe('http://manager1.com');
    });
  });

  describe('Token Management Integration', () => {
    it('should handle token refresh scenarios', () => {
      // 1. Set tokens with long expiry and userId for authentication
      configManager.updateTokens('expiring-token', 'refresh-token', 3600);
      configManager.updateConfig({ userId: 'test-user' });
      
      // 2. Initial state - should be authenticated and not need refresh
      expect(configManager.isAuthenticated()).toBe(true);
      expect(configManager.needsTokenRefresh()).toBe(false);
      
      // 3. Manually set expired token to test refresh logic
      const mockConfig = configManager.loadConfig();
      mockConfig.tokenExpiresAt = Date.now() - 1000; // Expired 1 second ago
      configManager.saveConfig(mockConfig);
      
      // 4. Should now need refresh
      expect(configManager.needsTokenRefresh()).toBe(true);
      
      // 5. Still authenticated but needs refresh
      expect(configManager.isAuthenticated()).toBe(true);
    });

    it('should clear tokens consistently across components', () => {
      // 1. Set up authenticated state
      configManager.updateTokens('token-to-clear', 'refresh-to-clear', 3600);
      configManager.updateConfig({ userId: 'user-to-clear' });
      
      expect(authManager.isAuthenticated()).toBe(true);
      
      // 2. Clear tokens
      configManager.clearTokens();
      
      // 3. All authentication should be cleared
      expect(authManager.isAuthenticated()).toBe(false);
      expect(authManager.getCurrentUserId()).toBeUndefined();
      
      const headers = authManager.getAuthHeaders();
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('Configuration Paths Integration', () => {
    it('should provide consistent paths across components', () => {
      const paths = configManager.getPaths();
      
      // All paths should be within the temp directory
      expect(paths.configPath).toContain(tempConfigDir);
      expect(paths.sessionPath).toContain(tempConfigDir);
      expect(paths.logsPath).toContain(tempConfigDir);
      
      // Paths should be valid
      expect(path.isAbsolute(paths.configPath)).toBe(true);
      expect(path.isAbsolute(paths.sessionPath)).toBe(true);
      expect(path.isAbsolute(paths.logsPath)).toBe(true);
    });

    it('should create directory structure as needed', () => {
      // ConfigManager should create necessary directories
      const config = configManager.loadConfig();
      expect(config).toBeDefined();
      
      // Config directory should exist
      expect(fs.existsSync(tempConfigDir)).toBe(true);
      
      // Should be able to save configuration
      configManager.saveConfig({
        endpoint: 'http://test.com',
        timeout: 30000
      });
      
      const configPath = path.join(tempConfigDir, 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });
  });
});