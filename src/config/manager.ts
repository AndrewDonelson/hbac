// file: src/config/manager.ts
// description: Configuration manager for loading and validating HBAC configurations

import fs from 'fs';
import path from 'path';
import { HBACConfig } from '../interfaces/config';
import { validateConfig } from './validator';

/**
 * Manages HBAC configuration loading and validation
 * 
 * Provides methods to load configuration from a file, validate its structure,
 * and retrieve the parsed configuration
 */
export class ConfigManager {
  /**
   * Stores the loaded and validated configuration
   */
  private config: HBACConfig | null = null;

  /**
   * Absolute path to the configuration file
   */
  private configPath: string;

  /**
   * Creates a new ConfigManager instance
   * 
   * @param configPath Path to the HBAC configuration file
   */
  constructor(configPath: string) {
    this.configPath = path.resolve(configPath);
  }

  /**
   * Loads and validates the configuration from the specified file
   * 
   * @returns The parsed and validated configuration
   * @throws {Error} If configuration loading or validation fails
   */
  public async load(): Promise<HBACConfig> {
    try {
      // Read configuration file
      const rawConfig = await fs.promises.readFile(this.configPath, 'utf-8');
      const config: HBACConfig = JSON.parse(rawConfig);
      
      // Validate configuration
      validateConfig(config);
      
      // Store the validated configuration
      this.config = config;
      
      return config;
    } catch (error) {
      // Provide a detailed error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred while loading the configuration';
      
      throw new Error(`Failed to load HBAC configuration: ${errorMessage}`);
    }
  }

  /**
   * Retrieves the currently loaded configuration
   * 
   * @returns The loaded configuration
   * @throws {Error} If no configuration has been loaded
   */
  public getConfig(): HBACConfig {
    if (!this.config) {
      throw new Error('Configuration has not been loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Checks if a configuration has been loaded
   * 
   * @returns Boolean indicating whether a configuration is loaded
   */
  public isConfigLoaded(): boolean {
    return this.config !== null;
  }
}