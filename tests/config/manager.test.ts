// file: tests/config/manager.test.ts
// description: Tests for the configuration manager component

import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../../src/config/manager';
import { HBACConfig } from '../../src/interfaces/config';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe('ConfigManager', () => {
  // Valid test configuration
  const validConfig: HBACConfig = {
    version: '1.0',
    database: {
      type: 'lowdb',
      connectionString: './test.json',
    },
    cache: {
      enabled: true,
      ttl: 300,
    },
    audit: {
      enabled: true,
      level: 'info',
    },
    policies: {
      defaultEffect: 'deny',
      evaluation: 'firstApplicable',
    },
    roles: {
      admin: {
        id: 'role_admin',
        description: 'Administrator',
        permissions: ['*:*'],
      },
    },
    attributes: {
      department: {
        id: 'attr_department',
        type: 'string',
        description: 'User department',
      },
    },
    policyRules: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load and validate a configuration file', async () => {
    // Mock fs.readFile to return a valid configuration
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(validConfig));

    const configManager = new ConfigManager('./config.json');
    const config = await configManager.load();

    // Check that readFile was called with the correct path
    expect(fs.promises.readFile).toHaveBeenCalledWith(
      expect.stringContaining('config.json'),
      'utf-8'
    );

    // Check that the returned config matches the expected value
    expect(config).toEqual(validConfig);
    
    // Check that getConfig returns the loaded config
    expect(configManager.getConfig()).toEqual(validConfig);
    
    // Check that isConfigLoaded returns true
    expect(configManager.isConfigLoaded()).toBe(true);
  });

  test('should throw error when loading invalid JSON', async () => {
    // Mock fs.readFile to return invalid JSON
    (fs.promises.readFile as jest.Mock).mockResolvedValue('{ invalid: json }');

    const configManager = new ConfigManager('./config.json');
    
    // Expect load to throw an error
    await expect(configManager.load()).rejects.toThrow(/Failed to load HBAC configuration/);
    
    // Check that isConfigLoaded returns false
    expect(configManager.isConfigLoaded()).toBe(false);
  });

  test('should throw error when file read fails', async () => {
    // Mock fs.readFile to throw an error
    (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

    const configManager = new ConfigManager('./config.json');
    
    // Expect load to throw an error
    await expect(configManager.load()).rejects.toThrow(/Failed to load HBAC configuration/);
  });

  test('should throw error when getting config before loading', () => {
    const configManager = new ConfigManager('./config.json');
    
    // Expect getConfig to throw an error
    expect(() => configManager.getConfig()).toThrow(/Configuration has not been loaded/);
  });
});