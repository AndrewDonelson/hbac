// file: tests/config/validator.test.ts
// description: Tests for the configuration validator component

import { validateConfig } from '../../src/config/validator';
import { HBACConfig } from '../../src/interfaces/config';
import { PolicyRule, Role, Permission } from '../../src/types';

describe('Config Validator', () => {
  // Base valid configuration
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
        permissions: ['*:*'] as Permission[],
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

  test('should validate a valid configuration', () => {
    // Should not throw an error
    expect(() => validateConfig(validConfig)).not.toThrow();
  });

  test('should throw error when missing version', () => {
    const invalidConfig = { ...validConfig } as any;
    delete invalidConfig.version;
    expect(() => validateConfig(invalidConfig)).toThrow(/must include a version/);
  });

  test('should throw error when missing database settings', () => {
    const invalidConfig = { ...validConfig } as any;
    delete invalidConfig.database;
    expect(() => validateConfig(invalidConfig)).toThrow(/must include database settings/);
  });

  test('should throw error when missing database type', () => {
    const invalidConfig = { 
      ...validConfig,
      database: { ...validConfig.database } 
    } as any;
    delete invalidConfig.database.type;
    expect(() => validateConfig(invalidConfig)).toThrow(/must specify a type/);
  });

  test('should throw error when missing policy settings', () => {
    const invalidConfig = { ...validConfig } as any;
    delete invalidConfig.policies;
    expect(() => validateConfig(invalidConfig)).toThrow(/must include policy settings/);
  });

  test('should throw error when no roles are defined', () => {
    const invalidConfig = { 
      ...validConfig,
      roles: {} 
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must include at least one role/);
  });

  test('should throw error for role without id', () => {
    const invalidConfig = {
      ...validConfig,
      roles: {
        admin: {
          description: 'Administrator',
          permissions: ['*:*'] as Permission[],
        } as Role,
      },
    } as HBACConfig;
    expect(() => validateConfig(invalidConfig)).toThrow(/must have a unique identifier/);
  });

  test('should throw error for role without permissions', () => {
    const invalidConfig = {
      ...validConfig,
      roles: {
        admin: {
          id: 'role_admin',
          description: 'Administrator',
          permissions: [],
        },
      },
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must have at least one permission/);
  });

  test('should throw error for invalid permission format', () => {
    const invalidConfig = {
      ...validConfig,
      roles: {
        admin: {
          id: 'role_admin',
          description: 'Administrator',
          permissions: ['invalid-format'] as unknown as Permission[],
        },
      },
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/Invalid permission format/);
  });

  test('should throw error for attribute without id', () => {
    const invalidConfig = {
      ...validConfig,
      attributes: {
        department: {
          type: 'string',
          description: 'User department',
        } as any,
      },
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must have a unique identifier/);
  });

  test('should throw error for attribute without type', () => {
    const invalidConfig = {
      ...validConfig,
      attributes: {
        department: {
          id: 'attr_department',
          description: 'User department',
        } as any,
      },
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must have a type/);
  });

  test('should throw error for invalid attribute type', () => {
    const invalidConfig = {
      ...validConfig,
      attributes: {
        department: {
          id: 'attr_department',
          type: 'invalid' as any,
          description: 'User department',
        },
      },
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/Invalid attribute type/);
  });

  test('should throw error for policy rule without id', () => {
    const invalidConfig = {
      ...validConfig,
      policyRules: [
        {
          resource: 'documents',
          action: 'read',
          condition: { 'attributes.department': 'Engineering' },
          effect: 'allow',
        } as unknown as PolicyRule,
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must have a unique identifier/);
  });

  test('should throw error for policy rule without resource', () => {
    const invalidConfig = {
      ...validConfig,
      policyRules: [
        {
          id: 'policy_test',
          action: 'read',
          condition: { 'attributes.department': 'Engineering' },
          effect: 'allow',
        } as unknown as PolicyRule,
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must specify a resource/);
  });

  test('should throw error for policy rule without action', () => {
    const invalidConfig = {
      ...validConfig,
      policyRules: [
        {
          id: 'policy_test',
          resource: 'documents',
          condition: { 'attributes.department': 'Engineering' },
          effect: 'allow',
        } as unknown as PolicyRule,
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must specify an action/);
  });

  test('should throw error for policy rule without effect', () => {
    const invalidConfig = {
      ...validConfig,
      policyRules: [
        {
          id: 'policy_test',
          resource: 'documents',
          action: 'read',
          condition: { 'attributes.department': 'Engineering' },
        } as unknown as PolicyRule,
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must specify an effect/);
  });

  test('should throw error for policy rule with invalid effect', () => {
    const invalidConfig = {
      ...validConfig,
      policyRules: [
        {
          id: 'policy_test',
          resource: 'documents',
          action: 'read',
          condition: { 'attributes.department': 'Engineering' },
          effect: 'invalid' as any,
        },
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/Invalid effect for policy rule/);
  });

  test('should throw error for policy rule without condition', () => {
    const invalidConfig = {
      ...validConfig,
      policyRules: [
        {
          id: 'policy_test',
          resource: 'documents',
          action: 'read',
          effect: 'allow',
        } as unknown as PolicyRule,
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(/must have a valid condition object/);
  });
});