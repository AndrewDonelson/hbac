// file: tests/cache/manager.test.ts
// description: Tests for the cache manager component

import { CacheManager } from '../../src/cache/manager';
import { CacheConfig } from '../../src/interfaces/config';

describe('CacheManager', () => {
  // Setup helper to manipulate time
  const originalDateNow = Date.now;
  
  beforeEach(() => {
    // Reset Date.now to its original implementation before each test
    jest.spyOn(Date, 'now').mockImplementation(() => originalDateNow());
  });
  
  afterEach(() => {
    // Restore original Date.now after each test
    jest.restoreAllMocks();
  });

  test('should store and retrieve values when enabled', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 300, // 5 minutes
    };
    
    const cacheManager = new CacheManager(config);
    
    // Store a value
    cacheManager.set('test-key', 'test-value');
    
    // Retrieve the value
    expect(cacheManager.get('test-key')).toBe('test-value');
    
    // Non-existent key
    expect(cacheManager.get('non-existent')).toBeNull();
  });

  test('should not store or retrieve values when disabled', () => {
    const config: CacheConfig = {
      enabled: false,
      ttl: 300,
    };
    
    const cacheManager = new CacheManager(config);
    
    // Store a value
    cacheManager.set('test-key', 'test-value');
    
    // Should not retrieve the value
    expect(cacheManager.get('test-key')).toBeNull();
  });

  test('should expire values after TTL', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 60, // 1 minute
    };
    
    const cacheManager = new CacheManager(config);
    
    // Mock time to a fixed value
    const currentTime = 1000000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    
    // Store a value
    cacheManager.set('test-key', 'test-value');
    
    // Value should exist now
    expect(cacheManager.get('test-key')).toBe('test-value');
    
    // Advance time by 30 seconds (not expired)
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 30000);
    expect(cacheManager.get('test-key')).toBe('test-value');
    
    // Advance time by 70 seconds (expired)
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 70000);
    expect(cacheManager.get('test-key')).toBeNull();
  });

  test('should use custom TTL when provided', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 60, // 1 minute default
    };
    
    const cacheManager = new CacheManager(config);
    
    // Mock time to a fixed value
    const currentTime = 1000000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    
    // Store a value with custom TTL (10 seconds)
    cacheManager.set('short-ttl', 'short-value', 10);
    
    // Store a value with default TTL (60 seconds)
    cacheManager.set('default-ttl', 'default-value');
    
    // Advance time by 15 seconds
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 15000);
    
    // Short TTL should be expired
    expect(cacheManager.get('short-ttl')).toBeNull();
    
    // Default TTL should still exist
    expect(cacheManager.get('default-ttl')).toBe('default-value');
  });

  test('should delete specific cache entries', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 300,
    };
    
    const cacheManager = new CacheManager(config);
    
    // Store multiple values
    cacheManager.set('key1', 'value1');
    cacheManager.set('key2', 'value2');
    
    // Delete one key
    cacheManager.delete('key1');
    
    // Check results
    expect(cacheManager.get('key1')).toBeNull();
    expect(cacheManager.get('key2')).toBe('value2');
  });

  test('should clear all cache entries', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 300,
    };
    
    const cacheManager = new CacheManager(config);
    
    // Store multiple values
    cacheManager.set('key1', 'value1');
    cacheManager.set('key2', 'value2');
    
    // Clear all keys
    cacheManager.clear();
    
    // Check results
    expect(cacheManager.get('key1')).toBeNull();
    expect(cacheManager.get('key2')).toBeNull();
  });

  test('should handle user roles caching', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 300,
    };
    
    const cacheManager = new CacheManager(config);
    const userId = 'user123';
    const roles = ['role_admin', 'role_editor'];
    
    // Set user roles
    cacheManager.setUserRoles(userId, roles);
    
    // Get user roles
    expect(cacheManager.getUserRoles(userId)).toEqual(roles);
    
    // Invalidate user
    cacheManager.invalidateUser(userId);
    
    // Roles should be cleared
    expect(cacheManager.getUserRoles(userId)).toBeNull();
  });

  test('should handle user attributes caching', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 300,
    };
    
    const cacheManager = new CacheManager(config);
    const userId = 'user123';
    const attributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 3,
    };
    
    // Set user attributes
    cacheManager.setUserAttributes(userId, attributes);
    
    // Get user attributes
    expect(cacheManager.getUserAttributes(userId)).toEqual(attributes);
    
    // Invalidate user
    cacheManager.invalidateUser(userId);
    
    // Attributes should be cleared
    expect(cacheManager.getUserAttributes(userId)).toBeNull();
  });

  test('should handle permission decision caching', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 300,
    };
    
    const cacheManager = new CacheManager(config);
    const userId = 'user123';
    const decisionKey = `${userId}:posts:read:{}`;
    
    // Set permission decision
    cacheManager.setPermissionDecision(decisionKey, true);
    
    // Get permission decision
    expect(cacheManager.getPermissionDecision(decisionKey)).toBe(true);
    
    // Invalidate user
    cacheManager.invalidateUser(userId);
    
    // Decision should be cleared
    expect(cacheManager.getPermissionDecision(decisionKey)).toBeNull();
  });

  test('should invalidate all related user cache entries', () => {
    const config: CacheConfig = {
      enabled: true,
      ttl: 300,
    };
    
    const cacheManager = new CacheManager(config);
    const userId = 'user123';
    
    // Set multiple entries
    cacheManager.setUserRoles(userId, ['role_admin']);
    cacheManager.setUserAttributes(userId, { 'attr_department': 'Engineering' });
    cacheManager.setPermissionDecision(`${userId}:posts:read:{}`, true);
    cacheManager.setPermissionDecision(`${userId}:documents:read:{}`, true);
    cacheManager.setPermissionDecision(`other-user:posts:read:{}`, true);
    
    // Invalidate user
    cacheManager.invalidateUser(userId);
    
    // User-specific entries should be cleared
    expect(cacheManager.getUserRoles(userId)).toBeNull();
    expect(cacheManager.getUserAttributes(userId)).toBeNull();
    expect(cacheManager.getPermissionDecision(`${userId}:posts:read:{}`)).toBeNull();
    expect(cacheManager.getPermissionDecision(`${userId}:documents:read:{}`)).toBeNull();
    
    // Other user entries should remain
    expect(cacheManager.getPermissionDecision(`other-user:posts:read:{}`)).toBe(true);
  });
});