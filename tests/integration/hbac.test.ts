// file: tests/integration/hbac.test.ts
// description: Integration tests for the main HBAC class

import { HBAC } from '../../src/HBAC';
import { ConfigManager } from '../../src/config/manager';
import { RoleManager } from '../../src/role/manager';
import { AttributeManager } from '../../src/attribute/manager';
import { PolicyEngine } from '../../src/policy/engine';
import { CacheManager } from '../../src/cache/manager';
import { HBACConfig } from '../../src/interfaces/config';

// Sample valid configuration
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
    user: {
      id: 'role_user',
      description: 'Regular User',
      permissions: ['posts:read', 'comments:write'],
    },
  },
  attributes: {
    department: {
      id: 'attr_department',
      type: 'string',
      description: 'User department',
    },
  },
  policyRules: [
    {
      id: 'policy_test',
      resource: 'documents',
      action: 'read',
      condition: { 'attributes.department': 'Engineering' },
      effect: 'allow',
    },
  ],
};

// Mock database connector
const mockDbConnector = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getUserRoles: jest.fn().mockResolvedValue(['role_admin']),
  getUserAttributes: jest.fn().mockResolvedValue({ 'attr_department': 'Engineering' }),
  assignRole: jest.fn().mockResolvedValue(undefined),
  removeRole: jest.fn().mockResolvedValue(undefined),
  setAttribute: jest.fn().mockResolvedValue(undefined),
  getUserAccessMap: jest.fn().mockResolvedValue({ 
    id: 'test-id', 
    userId: 'user123', 
    roleIds: ['role_admin'], 
    attributes: { 'attr_department': 'Engineering' } 
  }),
};

// Mock component objects
const mockRoleManager = {
  getRole: jest.fn().mockImplementation(roleId => {
    if (roleId === 'role_admin') {
      return { id: 'role_admin', permissions: ['*:*'] };
    }
    if (roleId === 'role_user') {
      return { id: 'role_user', permissions: ['posts:read', 'comments:write'] };
    }
    return undefined;
  }),
  hasPermission: jest.fn().mockReturnValue(true),
  getRoles: jest.fn().mockReturnValue(validConfig.roles),
  getPermissionsForRoles: jest.fn().mockReturnValue(new Set(['*:*'])),
};

const mockAttributeManager = {
  getAttribute: jest.fn().mockImplementation(attrId => {
    if (attrId === 'attr_department') {
      return { id: 'attr_department', type: 'string' };
    }
    return undefined;
  }),
  validateAttributeValue: jest.fn().mockReturnValue(true),
  getAttributes: jest.fn().mockReturnValue(validConfig.attributes),
  evaluateCondition: jest.fn().mockReturnValue(true),
};

const mockPolicyEngine = {
  evaluate: jest.fn().mockReturnValue(true),
};

const mockCacheManager = {
  getPermissionDecision: jest.fn().mockReturnValue(null),
  setPermissionDecision: jest.fn(),
  getUserRoles: jest.fn().mockReturnValue(null),
  setUserRoles: jest.fn(),
  getUserAttributes: jest.fn().mockReturnValue(null),
  setUserAttributes: jest.fn(),
  invalidateUser: jest.fn(),
};

// Mock ConfigManager
jest.mock('../../src/config/manager', () => {
  return {
    ConfigManager: jest.fn().mockImplementation(() => {
      return {
        load: jest.fn().mockResolvedValue(validConfig),
        getConfig: jest.fn().mockReturnValue(validConfig),
        isConfigLoaded: jest.fn().mockReturnValue(true),
      };
    }),
  };
});

// Mock all component constructors
jest.mock('../../src/role/manager', () => {
  return {
    RoleManager: jest.fn().mockImplementation(() => mockRoleManager),
  };
});

jest.mock('../../src/attribute/manager', () => {
  return {
    AttributeManager: jest.fn().mockImplementation(() => mockAttributeManager),
  };
});

jest.mock('../../src/policy/engine', () => {
  return {
    PolicyEngine: jest.fn().mockImplementation(() => mockPolicyEngine),
  };
});

jest.mock('../../src/cache/manager', () => {
  return {
    CacheManager: jest.fn().mockImplementation(() => mockCacheManager),
  };
});

// Mock the dynamic imports
jest.mock('../../src/db/lowdb/connector', () => {
  return {
    LowdbDatabaseConnector: jest.fn().mockImplementation(() => mockDbConnector),
  };
});

jest.mock('../../src/db/convex/connector', () => {
  return {
    ConvexDatabaseConnector: jest.fn().mockImplementation(() => mockDbConnector),
  };
});

jest.mock('../../src/db/mongodb/connector', () => {
  return {
    MongoDBDatabaseConnector: jest.fn().mockImplementation(() => mockDbConnector),
  };
});

jest.mock('../../src/db/postgres/connector', () => {
  return {
    PostgresDatabaseConnector: jest.fn().mockImplementation(() => mockDbConnector),
  };
});

describe('HBAC Integration', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should initialize correctly', async () => {
    const hbac = new HBAC('./config.json');
    await hbac.initialize();
    
    expect(ConfigManager).toHaveBeenCalledTimes(1);
    expect(RoleManager).toHaveBeenCalledTimes(1);
    expect(AttributeManager).toHaveBeenCalledTimes(1);
    expect(CacheManager).toHaveBeenCalledTimes(1);
    expect(PolicyEngine).toHaveBeenCalledTimes(1);
    expect(mockDbConnector.initialize).toHaveBeenCalledTimes(1);
  });
  
  test('should check permissions using can method', async () => {
    const hbac = new HBAC('./config.json');
    await hbac.initialize();
    
    // Reset mocks for this test
    mockCacheManager.getPermissionDecision.mockReturnValue(null);
    
    // Test permission check
    const result = await hbac.can('user123', 'read', 'documents');
    
    // Verify correct methods were called
    expect(mockCacheManager.getPermissionDecision).toHaveBeenCalled();
    expect(mockDbConnector.getUserRoles).toHaveBeenCalledWith('user123');
    expect(mockDbConnector.getUserAttributes).toHaveBeenCalledWith('user123');
    expect(mockPolicyEngine.evaluate).toHaveBeenCalledWith(
      ['role_admin'],
      { 'attr_department': 'Engineering' },
      'documents',
      'read',
      {}
    );
    expect(mockCacheManager.setPermissionDecision).toHaveBeenCalled();
    
    // Result should match policy engine evaluation
    expect(result).toBe(true);
  });
  
  test('should throw if check method fails', async () => {
    const hbac = new HBAC('./config.json');
    await hbac.initialize();
    
    // Mock cache miss
    mockCacheManager.getPermissionDecision.mockReturnValue(null);
    
    // Mock policy engine to deny access
    mockPolicyEngine.evaluate.mockReturnValueOnce(false);
    
    // Should throw with Access denied
    await expect(hbac.check('user123', 'read', 'documents'))
      .rejects.toThrow('Access denied');
  });
  
  test('should throw if used before initialization', async () => {
    const hbac = new HBAC('./config.json');
    
    // Try to use before initialization
    await expect(hbac.can('user123', 'read', 'documents'))
      .rejects.toThrow('HBAC not initialized');
  });
  
  test('should use cache for repeated calls', async () => {
    const hbac = new HBAC('./config.json');
    await hbac.initialize();
    
    // Reset mock counters
    mockDbConnector.getUserRoles.mockClear();
    mockDbConnector.getUserAttributes.mockClear();
    mockPolicyEngine.evaluate.mockClear();
    
    // First call: cache miss
    mockCacheManager.getPermissionDecision.mockReturnValueOnce(null);
    
    // First call should use database
    await hbac.can('user123', 'read', 'documents');
    
    // Second call: cache hit
    mockCacheManager.getPermissionDecision.mockReturnValueOnce(true);
    
    // Second call should use cache
    await hbac.can('user123', 'read', 'documents');
    
    // Database methods should be called only once
    expect(mockDbConnector.getUserRoles).toHaveBeenCalledTimes(1);
    expect(mockDbConnector.getUserAttributes).toHaveBeenCalledTimes(1);
    expect(mockPolicyEngine.evaluate).toHaveBeenCalledTimes(1);
  });
  
  test('should invalidate cache when role changes', async () => {
    const hbac = new HBAC('./config.json');
    await hbac.initialize();
    
    // Assign role to user
    await hbac.assignRole('user123', 'role_admin');
    
    // Verify cache invalidation
    expect(mockDbConnector.assignRole).toHaveBeenCalledWith('user123', 'role_admin');
    expect(mockCacheManager.invalidateUser).toHaveBeenCalledWith('user123');
  });
  
  test('should invalidate cache when attribute changes', async () => {
    const hbac = new HBAC('./config.json');
    await hbac.initialize();
    
    // Set attribute for user
    await hbac.setAttribute('user123', 'attr_department', 'Sales');
    
    // Verify cache invalidation
    expect(mockDbConnector.setAttribute).toHaveBeenCalledWith('user123', 'attr_department', 'Sales');
    expect(mockCacheManager.invalidateUser).toHaveBeenCalledWith('user123');
  });
  
  test('should throw error for invalid roles and attributes', async () => {
    const hbac = new HBAC('./config.json');
    await hbac.initialize();
    
    // Mock role validation to return undefined (invalid role)
    mockRoleManager.getRole.mockReturnValueOnce(undefined);
    
    // Should throw for invalid role
    await expect(hbac.assignRole('user123', 'invalid_role'))
      .rejects.toThrow('Invalid role ID');
    
    // Mock attribute validation to return undefined (invalid attribute)
    mockAttributeManager.getAttribute.mockReturnValueOnce(undefined);
    
    // Should throw for invalid attribute
    await expect(hbac.setAttribute('user123', 'invalid_attr', 'value'))
      .rejects.toThrow('Invalid attribute ID');
  });
  
  test('should handle dynamic database connector loading', async () => {
    // Modify config to use a different database type
    const convexConfig = {
      ...validConfig,
      database: {
        type: 'convex',
        connectionString: 'https://example.convex.dev',
      },
    };
    
    // Mock ConfigManager to return this config
    const configManagerMock = jest.requireMock('../../src/config/manager');
    configManagerMock.ConfigManager.mockImplementationOnce(() => {
      return {
        load: jest.fn().mockResolvedValue(convexConfig),
        getConfig: jest.fn().mockReturnValue(convexConfig),
        isConfigLoaded: jest.fn().mockReturnValue(true),
      };
    });
    
    // Initialize with convex config
    const hbac = new HBAC('./convex-config.json');
    
    // Should initialize without error
    await expect(hbac.initialize()).resolves.not.toThrow();
  });
});