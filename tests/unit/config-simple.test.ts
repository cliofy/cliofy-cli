/**
 * Simple ConfigManager unit tests that work with actual implementation
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { DEFAULT_CONFIG } from '../../packages/core/src/config/types';

// Mock filesystem operations
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn()
}));

jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock/home')
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;

describe('ConfigManager Simple Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = '/tmp/test-config';
    
    // Setup default mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Configuration Loading', () => {
    it('should handle default configuration when no file exists', async () => {
      // Use dynamic import to avoid module resolution issues during test setup
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      mockFs.existsSync.mockReturnValue(false);
      
      const configManager = new ConfigManager(tempDir);
      const config = configManager.loadConfig();
      
      expect(config).toHaveProperty('endpoint');
      expect(config).toHaveProperty('timeout');
      expect(config.endpoint).toBe(DEFAULT_CONFIG.endpoint);
      expect(config.timeout).toBe(30000);
    });

    it('should load existing configuration from file', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      const mockConfig = {
        endpoint: 'http://custom.example.com',
        timeout: 60000,
        apiKey: 'test-api-key',
        userId: 'user-123'
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      
      const configManager = new ConfigManager(tempDir);
      const config = configManager.loadConfig();
      
      expect(config.endpoint).toBe(mockConfig.endpoint);
      expect(config.timeout).toBe(mockConfig.timeout);
      expect(config.apiKey).toBe(mockConfig.apiKey);
      expect(config.userId).toBe(mockConfig.userId);
    });

    it('should handle corrupted configuration file gracefully', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json content');
      
      // Mock console.warn to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const configManager = new ConfigManager(tempDir);
      const config = configManager.loadConfig();
      
      // Should fall back to default config
      expect(config.endpoint).toBe(DEFAULT_CONFIG.endpoint);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load configuration'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Saving', () => {
    it('should save valid configuration to file', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      const configData = {
        endpoint: 'http://test.example.com',
        timeout: 45000,
        apiKey: 'save-test-key',
        userId: 'save-user-123'
      };
      
      const configManager = new ConfigManager(tempDir);
      configManager.saveConfig(configData);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        JSON.stringify(configData, null, 2),
        'utf-8'
      );
    });

    it('should handle file write errors gracefully', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const configManager = new ConfigManager(tempDir);
      const configData = { endpoint: 'http://test.com', timeout: 30000 };
      
      expect(() => {
        configManager.saveConfig(configData);
      }).toThrow('Permission denied');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save configuration:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Authentication Methods', () => {
    it('should detect when user is not authenticated', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      mockFs.existsSync.mockReturnValue(false);
      
      const configManager = new ConfigManager(tempDir);
      
      expect(configManager.isAuthenticated()).toBe(false);
    });

    it('should detect when user is authenticated', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      const authConfig = {
        endpoint: DEFAULT_CONFIG.endpoint,
        timeout: 30000,
        apiKey: 'valid-token',
        userId: 'user-123'
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(authConfig));
      
      const configManager = new ConfigManager(tempDir);
      
      expect(configManager.isAuthenticated()).toBe(true);
    });

    it('should return correct API headers without authentication', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      mockFs.existsSync.mockReturnValue(false);
      
      const configManager = new ConfigManager(tempDir);
      const headers = configManager.getApiHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'cliofy-cli/0.1.0'
      });
      expect(headers.Authorization).toBeUndefined();
    });

    it('should return correct API headers with authentication', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      const authConfig = {
        endpoint: DEFAULT_CONFIG.endpoint,
        timeout: 30000,
        apiKey: 'bearer-token-123',
        userId: 'user-123'
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(authConfig));
      
      const configManager = new ConfigManager(tempDir);
      const headers = configManager.getApiHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'cliofy-cli/0.1.0',
        'Authorization': 'Bearer bearer-token-123'
      });
    });
  });

  describe('Token Management', () => {
    it('should detect when token needs refresh', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      const expiredConfig = {
        endpoint: DEFAULT_CONFIG.endpoint,
        timeout: 30000,
        apiKey: 'expired-token',
        tokenExpiresAt: Date.now() - 1000 // Expired 1 second ago
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(expiredConfig));
      
      const configManager = new ConfigManager(tempDir);
      
      expect(configManager.needsTokenRefresh()).toBe(true);
    });

    it('should update tokens correctly', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        endpoint: DEFAULT_CONFIG.endpoint,
        timeout: 30000
      }));
      
      // Reset mock to not throw error for this test
      mockFs.writeFileSync.mockClear();
      mockFs.writeFileSync.mockImplementation();
      
      const configManager = new ConfigManager(tempDir);
      
      const accessToken = 'new-access-token';
      const refreshToken = 'new-refresh-token';
      const expiresIn = 3600;
      
      configManager.updateTokens(accessToken, refreshToken, expiresIn);
      
      // Check that writeFileSync was called with updated config
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const savedConfigStr = mockFs.writeFileSync.mock.calls[0][1] as string;
      const savedConfig = JSON.parse(savedConfigStr);
      
      expect(savedConfig.apiKey).toBe(accessToken);
      expect(savedConfig.refreshToken).toBe(refreshToken);
      expect(savedConfig.tokenExpiresAt).toBeGreaterThan(Date.now());
    });

    it('should clear tokens correctly', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      const authConfig = {
        endpoint: DEFAULT_CONFIG.endpoint,
        timeout: 30000,
        apiKey: 'token-to-clear',
        refreshToken: 'refresh-to-clear',
        tokenExpiresAt: Date.now() + 3600000,
        userId: 'user-to-clear'
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(authConfig));
      
      // Reset mock to not throw error for this test
      mockFs.writeFileSync.mockClear();
      mockFs.writeFileSync.mockImplementation();
      
      const configManager = new ConfigManager(tempDir);
      configManager.clearTokens();
      
      // Check that tokens were cleared in saved config
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const savedConfigStr = mockFs.writeFileSync.mock.calls[0][1] as string;
      const savedConfig = JSON.parse(savedConfigStr);
      
      expect(savedConfig.apiKey).toBeUndefined();
      expect(savedConfig.refreshToken).toBeUndefined();
      expect(savedConfig.tokenExpiresAt).toBeUndefined();
      expect(savedConfig.userId).toBeUndefined();
    });
  });

  describe('Configuration Paths', () => {
    it('should return correct configuration paths', async () => {
      const { ConfigManager } = await import('../../packages/core/src/config/manager');
      
      const configManager = new ConfigManager(tempDir);
      const paths = configManager.getPaths();
      
      expect(paths).toEqual({
        configPath: expect.stringContaining('config.json'),
        sessionPath: expect.stringContaining('session.json'),
        logsPath: expect.stringContaining('logs')
      });
    });
  });
});