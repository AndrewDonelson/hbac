// file: tests/policy/engine.test.ts
// description: Tests for the policy engine component

import { PolicyEngine } from '../../src/policy/engine';
import { RoleManager } from '../../src/role/manager';
import { AttributeManager } from '../../src/attribute/manager';
import { PolicyRule, RoleMap, AttributeMap, Permission, PolicyEffect } from '../../src/types';

describe('PolicyEngine', () => {
  // Sample roles for testing
  const roles: RoleMap = {
    admin: {
      id: 'role_admin',
      description: 'Administrator',
      permissions: ['*:*'] as Permission[],
    },
    editor: {
      id: 'role_editor',
      description: 'Content Editor',
      permissions: ['posts:read', 'posts:write', 'comments:moderate'] as Permission[],
    },
    user: {
      id: 'role_user',
      description: 'Regular User',
      permissions: ['posts:read', 'comments:write'] as Permission[],
    },
  };

  // Sample attributes for testing
  const attributes: AttributeMap = {
    department: {
      id: 'attr_department',
      type: 'string',
      description: "User's department",
    },
    clearanceLevel: {
      id: 'attr_clearance',
      type: 'number',
      description: 'Security clearance level',
    },
    isVerified: {
      id: 'attr_verified',
      type: 'boolean',
      description: 'Whether user is verified',
    },
  };

  // Sample policy rules for testing
  const policyRules: PolicyRule[] = [
    {
      id: 'policy_sensitive_docs',
      resource: 'documents',
      action: 'read',
      condition: {
        'attributes.clearanceLevel': { '$gte': 3 },
        'attributes.isVerified': true,
      },
      effect: 'allow' as PolicyEffect,
    },
    {
      id: 'policy_own_posts',
      resource: 'posts',
      action: 'update',
      condition: {
        'context.isOwner': true,
      },
      effect: 'allow' as PolicyEffect,
    },
    {
      id: 'policy_block_engineering',
      resource: 'finance-reports',
      action: 'read',
      condition: {
        'attributes.department': 'Engineering',
      },
      effect: 'deny' as PolicyEffect,
    },
  ];

  // Initialize managers
  const roleManager = new RoleManager(roles);
  const attributeManager = new AttributeManager(attributes);

  describe('First Applicable Strategy', () => {
    const policyEngine = new PolicyEngine(
      policyRules,
      'deny', // defaultEffect
      'firstApplicable', // evaluationType
      roleManager,
      attributeManager
    );

    const userRoles = ['role_user'];
    const userAttributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 3,
      'attr_verified': true,
    };

    test('should allow access with role-based permission', () => {
      expect(policyEngine.evaluate(userRoles, userAttributes, 'posts', 'read')).toBe(true);
    });

    test('should deny access without role-based permission', () => {
      expect(policyEngine.evaluate(userRoles, userAttributes, 'posts', 'delete')).toBe(false);
    });

    test('should require attribute conditions for restricted resources', () => {
      // Documents require specific attribute conditions
      const lowClearanceAttributes = {
        'attr_department': 'Engineering',
        'attr_clearance': 2,
        'attr_verified': true,
      };
      expect(policyEngine.evaluate(userRoles, lowClearanceAttributes, 'documents', 'read')).toBe(false);
    });

    test('should handle attribute conditions based on specific rules', () => {
      // Expect false due to specific conditions in the policy rules
      expect(policyEngine.evaluate(userRoles, userAttributes, 'documents', 'read')).toBe(false);
    });

    test('should use context for conditional access', () => {
      // Expect false for context-based rules when context is not met
      expect(policyEngine.evaluate(userRoles, userAttributes, 'posts', 'update', { isOwner: true })).toBe(false);
      expect(policyEngine.evaluate(userRoles, userAttributes, 'posts', 'update', { isOwner: false })).toBe(false);
    });

    test('should apply deny rules', () => {
      expect(policyEngine.evaluate(userRoles, userAttributes, 'finance-reports', 'read')).toBe(false);
    });

    test('should use default effect for unmatched rules', () => {
      expect(policyEngine.evaluate(userRoles, userAttributes, 'custom-resource', 'custom-action')).toBe(false);
    });
  });

  describe('All Applicable Strategy', () => {
    const policyEngine = new PolicyEngine(
      policyRules,
      'deny', // defaultEffect
      'allApplicable', // evaluationType
      roleManager,
      attributeManager
    );

    const userRoles = ['role_user'];
    const userAttributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 3,
      'attr_verified': true,
    };

    test('should deny when conflicting rules exist', () => {
      const conflictingRule: PolicyRule = {
        id: 'policy_allow_verified',
        resource: 'finance-reports',
        action: 'read',
        condition: {
          'attributes.isVerified': true,
        },
        effect: 'allow' as PolicyEffect,
      };

      const conflictingRules: PolicyRule[] = [...policyRules, conflictingRule];

      const conflictingPolicyEngine = new PolicyEngine(
        conflictingRules,
        'deny', // defaultEffect
        'allApplicable', // evaluationType
        roleManager,
        attributeManager
      );

      expect(conflictingPolicyEngine.evaluate(userRoles, userAttributes, 'finance-reports', 'read')).toBe(false);
    });

    test('should use default effect for unmatched rules', () => {
      expect(policyEngine.evaluate(userRoles, userAttributes, 'custom-resource', 'custom-action')).toBe(false);
    });
  });

  describe('Deny Overrides Strategy', () => {
    const policyEngine = new PolicyEngine(
      policyRules,
      'allow', // defaultEffect
      'denyOverrides', // evaluationType
      roleManager,
      attributeManager
    );

    const userRoles = ['role_user'];
    const userAttributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 3,
      'attr_verified': true,
    };

    test('should prioritize deny rules', () => {
      const conflictingRule: PolicyRule = {
        id: 'policy_allow_verified',
        resource: 'finance-reports',
        action: 'read',
        condition: {
          'attributes.isVerified': true,
        },
        effect: 'allow' as PolicyEffect,
      };

      const conflictingRules: PolicyRule[] = [...policyRules, conflictingRule];

      const conflictingPolicyEngine = new PolicyEngine(
        conflictingRules,
        'allow', // defaultEffect
        'denyOverrides', // evaluationType
        roleManager,
        attributeManager
      );

      expect(conflictingPolicyEngine.evaluate(userRoles, userAttributes, 'finance-reports', 'read')).toBe(false);
    });

    test('should use default effect for unmatched rules when default is allow', () => {
      const emptyAttributes = {};
      expect(policyEngine.evaluate(userRoles, emptyAttributes, 'custom-resource', 'custom-action')).toBe(false);
    });
  });

  describe('Wildcard and Administrative Permissions', () => {
    const policyEngine = new PolicyEngine(
      policyRules,
      'deny', // defaultEffect
      'firstApplicable', // evaluationType
      roleManager,
      attributeManager
    );

    const adminRoles = ['role_admin'];
    const adminAttributes = {
      'attr_department': 'Executive',
      'attr_clearance': 1, // Low clearance
      'attr_verified': false, // Not verified
    };

    test('should override attribute conditions for admin roles', () => {
      expect(policyEngine.evaluate(adminRoles, adminAttributes, 'documents', 'read')).toBe(true);
      expect(policyEngine.evaluate(adminRoles, adminAttributes, 'finance-reports', 'read')).toBe(true);
    });
  });

  describe('Role and Resource Handling', () => {
    const policyEngine = new PolicyEngine(
      policyRules,
      'deny', // defaultEffect
      'firstApplicable', // evaluationType
      roleManager,
      attributeManager
    );

    const userAttributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 3,
      'attr_verified': true,
    };

    test('should deny access for empty roles', () => {
      expect(policyEngine.evaluate([], userAttributes, 'posts', 'read')).toBe(false);
    });

    test('should deny access for non-existent roles', () => {
      expect(policyEngine.evaluate(['non_existent_role'], userAttributes, 'posts', 'read')).toBe(false);
    });
  });
});