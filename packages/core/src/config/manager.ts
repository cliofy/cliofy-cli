/**
 * Configuration manager for the Cliofy CLI
 * Handles loading, saving, and managing CLI configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config, ConfigUpdate, ConfigSchema, DEFAULT_CONFIG, CONFIG_PATHS } from './types';

export class ConfigManager {
  private configPath: string;
  private sessionPath: string;
  private logsPath: string;
  private _config: Config | null = null;

  constructor(configDir?: string) {
    const baseDir = configDir || path.join(os.homedir(), CONFIG_PATHS.configDir);
    
    this.configPath = path.join(baseDir, CONFIG_PATHS.configFile);
    this.sessionPath = path.join(baseDir, CONFIG_PATHS.sessionFile);
    this.logsPath = path.join(baseDir, CONFIG_PATHS.logsDir);

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      path.dirname(this.configPath),
      path.dirname(this.sessionPath),
      this.logsPath,
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get current configuration
   */
  get config(): Config {
    if (this._config === null) {
      this._config = this.loadConfig();
    }
    return this._config;
  }

  /**
   * Load configuration from persistent storage
   */
  loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const rawData = fs.readFileSync(this.configPath, 'utf-8');
        const data = JSON.parse(rawData);
        
        // Validate and merge with defaults
        const result = ConfigSchema.safeParse(data);
        if (result.success) {
          return result.data;
        } else {
          console.warn('Invalid configuration found, using defaults:', result.error.message);
          return DEFAULT_CONFIG;
        }
      }
      
      return DEFAULT_CONFIG;
    } catch (error) {
      console.warn('Failed to load configuration, using defaults:', error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save configuration to persistent storage
   */
  saveConfig(config?: Config): void {
    const configToSave = config || this._config;
    if (!configToSave) return;

    try {
      // Validate before saving
      const result = ConfigSchema.safeParse(configToSave);
      if (!result.success) {
        throw new Error(`Invalid configuration: ${result.error.message}`);
      }

      // Save to JSON file
      fs.writeFileSync(this.configPath, JSON.stringify(result.data, null, 2), 'utf-8');
      this._config = result.data;
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Update configuration with partial updates
   */
  updateConfig(updates: ConfigUpdate): void {
    const currentConfig = this.config;
    const newConfig = { ...currentConfig, ...updates };
    
    // Remove undefined values
    Object.keys(newConfig).forEach(key => {
      if ((newConfig as any)[key] === undefined) {
        delete (newConfig as any)[key];
      }
    });

    this.saveConfig(newConfig);
  }

  /**
   * Clear all configuration
   */
  clearConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
      this._config = DEFAULT_CONFIG;
    } catch (error) {
      console.error('Failed to clear configuration:', error);
      throw error;
    }
  }

  /**
   * Get API headers for HTTP requests
   * Uses Firebase ID Token for authentication
   */
  getApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'cliofy-cli/0.1.0',
    };

    // Use Firebase ID Token for authentication
    if (this.config.firebaseIdToken) {
      headers['Authorization'] = `Bearer ${this.config.firebaseIdToken}`;
    }

    return headers;
  }

  /**
   * Check if user is authenticated
   * Uses Firebase authentication exclusively
   */
  isAuthenticated(): boolean {
    return !!(this.config.firebaseIdToken && this.config.firebaseUid);
  }

  /**
   * Clear Firebase authentication tokens
   */
  clearTokens(): void {
    this.updateConfig({
      firebaseIdToken: undefined,
      firebaseRefreshToken: undefined,
      firebaseUid: undefined,
      userEmail: undefined,
      firebaseTokenExpiresAt: undefined,
    });
  }

  /**
   * Update Firebase authentication tokens
   */
  updateFirebaseTokens(
    idToken: string,
    refreshToken: string,
    expiresIn: number,
    uid: string,
    email?: string
  ): void {
    const currentTime = Date.now();
    this.updateConfig({
      firebaseIdToken: idToken,
      firebaseRefreshToken: refreshToken,
      firebaseUid: uid,
      userEmail: email,
      firebaseTokenExpiresAt: currentTime + (expiresIn * 1000), // Convert seconds to ms
      lastLogin: new Date().toISOString(),
    });
  }

  /**
   * Get Firebase refresh token
   */
  getFirebaseRefreshToken(): string | undefined {
    return this.config.firebaseRefreshToken;
  }

  /**
   * Get Firebase UID
   */
  getFirebaseUid(): string | undefined {
    return this.config.firebaseUid;
  }

  /**
   * Get user email
   */
  getUserEmail(): string | undefined {
    return this.config.userEmail;
  }

  /**
   * Check if Firebase token needs refresh
   */
  needsFirebaseTokenRefresh(): boolean {
    if (!this.config.firebaseTokenExpiresAt) {
      return false;
    }

    // Refresh if token expires in less than 5 minutes
    const bufferTime = 5 * 60 * 1000; // 5 minutes in ms
    const currentTime = Date.now();
    return currentTime >= (this.config.firebaseTokenExpiresAt - bufferTime);
  }

  /**
   * Clear only Firebase authentication tokens
   */
  clearFirebaseTokens(): void {
    this.updateConfig({
      firebaseIdToken: undefined,
      firebaseRefreshToken: undefined,
      firebaseUid: undefined,
      userEmail: undefined,
      firebaseTokenExpiresAt: undefined,
    });
  }

  /**
   * Get configuration file paths
   */
  getPaths(): {
    configPath: string;
    sessionPath: string;
    logsPath: string;
  } {
    return {
      configPath: this.configPath,
      sessionPath: this.sessionPath,
      logsPath: this.logsPath,
    };
  }

  /**
   * Export configuration for debugging
   */
  exportConfig(): Config {
    return { ...this.config };
  }

  /**
   * Import configuration (useful for testing)
   */
  importConfig(config: Config): void {
    this.saveConfig(config);
  }
}