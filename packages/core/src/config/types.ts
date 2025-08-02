/**
 * Configuration types for the Cliofy CLI
 */

import { z } from 'zod';

/**
 * Configuration schema for validation
 */
export const ConfigSchema = z.object({
  endpoint: z.string().url().default('http://localhost:5173'),
  timeout: z.number().int().positive().default(30000),
  apiKey: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.number().optional(),
  userId: z.string().optional(),
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