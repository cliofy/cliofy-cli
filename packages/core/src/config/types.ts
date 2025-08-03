/**
 * Configuration types for the Cliofy CLI
 */

import { z } from 'zod';

/**
 * Configuration schema for validation
 * Uses Firebase authentication exclusively
 */
export const ConfigSchema = z.object({
  endpoint: z.string().url().default('http://localhost:5173'),
  timeout: z.number().int().positive().default(30000),
  
  // Firebase authentication fields
  firebaseIdToken: z.string().optional(),
  firebaseRefreshToken: z.string().optional(),
  firebaseUid: z.string().optional(),
  userEmail: z.string().email().optional(),
  firebaseTokenExpiresAt: z.number().optional(),
  
  // Legacy field for backwards compatibility during migration
  lastLogin: z.string().optional(),
});

/**
 * Configuration interface
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Partial configuration for updates
 */
export type ConfigUpdate = Partial<Config>;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  endpoint: process.env.CLIOFY_ENDPOINT || process.env.TEST_API_ENDPOINT || 'http://localhost:5173',
  timeout: parseInt(process.env.CLIOFY_TIMEOUT || '30000', 10),
};

/**
 * Configuration file paths and directories
 */
export const CONFIG_PATHS = {
  configDir: '.cliofy',
  configFile: 'config.json',
  sessionFile: 'session.json',
  logsDir: 'logs',
} as const;