// file: tests/db/lowdb/connector.test.ts
// description: Tests for the LowDB database connector component

import fs from 'fs/promises';
import { LowdbDatabaseConnector } from '../../../src/db/lowdb/connector';
import { DatabaseConfig } from '../../../src/interfaces/config';
import { UserAccessMap } from '../../../src/types';

// Mock fs module
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  access: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('LowdbDatabaseConnector', () => {
  const testConfig: DatabaseConfig = {
    type: 'lowdb',
    connectionString: './test-db.json',
  };

  const emptyDatabase = JSON.stringify({ user_access_map: [] });
  const testUserMap: UserAccessMap = {
    id: 'existing-id',
    userId: 'test-user',
    roleIds: ['role_user'],
    attributes: {
      'attr_department': 'Engineering',
    },
  };
  const databaseWithUser = JSON.stringify({
    user_access_map: [testUserMap],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default file path', async () => {
    const configWithoutPath: DatabaseConfig = {
      type: 'lowdb',
    };
    
    const connector = new LowdbDatabaseConnector(configWithoutPath);
    
    // Mock access to throw error (file not found)
    (fs.access as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.initialize();
    
    // Should create file with default structure
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({ user_access_map: [] }, null, 2),
      'utf-8'
    );
  });

  test('should initialize with existing file', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock access to succeed (file exists)
    (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
    // Mock readFile to return empty database
    (fs.readFile as jest.Mock).mockResolvedValueOnce(emptyDatabase);
    
    await connector.initialize();
    
    // Should read the file
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('test-db.json'),
      'utf-8'
    );
    // Should not create the file
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  test('should get user roles', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return database with user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    
    const roles = await connector.getUserRoles('test-user');
    
    // Should return roles for the user
    expect(roles).toEqual(['role_user']);
    
    // Test for non-existent user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    const emptyRoles = await connector.getUserRoles('non-existent');
    
    // Should return empty array
    expect(emptyRoles).toEqual([]);
  });

  test('should get user attributes', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return database with user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    
    const attributes = await connector.getUserAttributes('test-user');
    
    // Should return attributes for the user
    expect(attributes).toEqual({
      'attr_department': 'Engineering',
    });
    
    // Test for non-existent user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    const emptyAttributes = await connector.getUserAttributes('non-existent');
    
    // Should return empty object
    expect(emptyAttributes).toEqual({});
  });

  test('should assign role to existing user', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return database with user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.assignRole('test-user', 'role_editor');
    
    // Should update the database with new role
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('role_editor'),
      'utf-8'
    );
    
    // Extract the written data
    const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);
    
    // Verify the role was added
    expect(writtenData.user_access_map[0].roleIds).toContain('role_user');
    expect(writtenData.user_access_map[0].roleIds).toContain('role_editor');
  });

  test('should assign role to new user', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return empty database
    (fs.readFile as jest.Mock).mockResolvedValueOnce(emptyDatabase);
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.assignRole('new-user', 'role_user');
    
    // Should update the database with new user and role
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('new-user'),
      'utf-8'
    );
    
    // Extract the written data
    const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);
    
    // Verify the user and role was added
    expect(writtenData.user_access_map[0].userId).toBe('new-user');
    expect(writtenData.user_access_map[0].roleIds).toEqual(['role_user']);
    expect(writtenData.user_access_map[0].attributes).toEqual({});
  });

  test('should not duplicate roles when assigning', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return database with user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.assignRole('test-user', 'role_user');
    
    // Extract the written data
    const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);
    
    // Verify the role was not duplicated
    expect(writtenData.user_access_map[0].roleIds).toEqual(['role_user']);
    expect(writtenData.user_access_map[0].roleIds.length).toBe(1);
  });

  test('should remove role from user', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Create user with multiple roles
    const userWithMultipleRoles = {
      user_access_map: [
        {
          id: 'existing-id',
          userId: 'test-user',
          roleIds: ['role_user', 'role_editor'],
          attributes: {},
        },
      ],
    };
    
    // Mock readFile to return database with user having multiple roles
    (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(userWithMultipleRoles));
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.removeRole('test-user', 'role_editor');
    
    // Extract the written data
    const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);
    
    // Verify the role was removed
    expect(writtenData.user_access_map[0].roleIds).toEqual(['role_user']);
    expect(writtenData.user_access_map[0].roleIds).not.toContain('role_editor');
  });

  test('should not fail when removing non-existent role', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return database with user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.removeRole('test-user', 'non-existent-role');
    
    // Extract the written data
    const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);
    
    // Verify the roles remained unchanged
    expect(writtenData.user_access_map[0].roleIds).toEqual(['role_user']);
  });

  test('should set attribute for existing user', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return database with user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.setAttribute('test-user', 'attr_clearance', 3);
    
    // Should update the database with new attribute
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('attr_clearance'),
      'utf-8'
    );
    
    // Extract the written data
    const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);
    
    // Verify the attribute was added
    expect(writtenData.user_access_map[0].attributes['attr_department']).toBe('Engineering');
    expect(writtenData.user_access_map[0].attributes['attr_clearance']).toBe(3);
  });

  test('should set attribute for new user', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return empty database
    (fs.readFile as jest.Mock).mockResolvedValueOnce(emptyDatabase);
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.setAttribute('new-user', 'attr_department', 'Sales');
    
    // Should update the database with new user and attribute
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Sales'),
      'utf-8'
    );
    
    // Extract the written data
    const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);
    
    // Verify the user and attribute was added
    expect(writtenData.user_access_map[0].userId).toBe('new-user');
    expect(writtenData.user_access_map[0].roleIds).toEqual([]);
    expect(writtenData.user_access_map[0].attributes['attr_department']).toBe('Sales');
  });

  test('should get user access map', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return database with user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    
    const userMap = await connector.getUserAccessMap('test-user');
    
    // Should return complete user access map
    expect(userMap).toEqual(testUserMap);
    
    // Test for non-existent user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    const nullMap = await connector.getUserAccessMap('non-existent');
    
    // Should return null
    expect(nullMap).toBeNull();
  });

  test('should handle read errors gracefully', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock access to succeed
    (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
    // Mock readFile to fail
    (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('Read error'));
    // Mock writeFile
    (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
    
    await connector.initialize();
    
    // Should reset to empty database
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({ user_access_map: [] }, null, 2),
      'utf-8'
    );
  });

  test('should handle write errors by throwing', async () => {
    const connector = new LowdbDatabaseConnector(testConfig);
    
    // Mock readFile to return database with user
    (fs.readFile as jest.Mock).mockResolvedValueOnce(databaseWithUser);
    // Mock writeFile to fail
    (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write error'));
    
    // Should throw error when setting attribute fails
    await expect(connector.setAttribute('test-user', 'attr_clearance', 3))
      .rejects.toThrow();
  });
});