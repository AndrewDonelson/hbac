// file: src/config/validator.ts
// description: Configuration validator for checking HBAC configuration integrity and completeness

import { HBACConfig } from '../interfaces/config';
import { Role, Attribute } from '../types';

/**
 * Validates the HBAC configuration for structural integrity and required fields
 * 
 * @param config The configuration object to validate
 * @throws {Error} If the configuration is invalid
 */
export function validateConfig(config: HBACConfig): void {
  // Validate top-level configuration fields
  validateTopLevelFields(config);

  // Validate roles
  validateRoles(config);

  // Validate attributes
  validateAttributes(config);

  // Validate policy rules
  validatePolicyRules(config);
}

/**
 * Validates top-level configuration fields
 * 
 * @param config Configuration to validate
 */
function validateTopLevelFields(config: HBACConfig): void {
  if (!config.version) {
    throw new Error('Configuration must include a version');
  }

  if (!config.database) {
    throw new Error('Configuration must include database settings');
  }

  if (!config.policies) {
    throw new Error('Configuration must include policy settings');
  }

  // Validate database configuration
  if (!config.database.type) {
    throw new Error('Database configuration must specify a type');
  }
}

/**
 * Validates role configurations
 * 
 * @param config Configuration to validate
 */
function validateRoles(config: HBACConfig): void {
  if (!config.roles || Object.keys(config.roles).length === 0) {
    throw new Error('Configuration must include at least one role');
  }

  Object.entries(config.roles).forEach(([roleName, role]) => {
    // Type assertion to resolve 'unknown' type
    const typedRole = role as Role;

    if (!typedRole.id) {
      throw new Error(`Role "${roleName}" must have a unique identifier`);
    }

    if (!Array.isArray(typedRole.permissions) || typedRole.permissions.length === 0) {
      throw new Error(`Role "${roleName}" must have at least one permission`);
    }

    // Validate permission format
    typedRole.permissions.forEach(permission => {
      if (!/^(\*|[\w-]+):(\*|[\w-]+)(:own)?$/.test(permission)) {
        throw new Error(`Invalid permission format: ${permission}`);
      }
    });
  });
}

/**
 * Validates attribute configurations
 * 
 * @param config Configuration to validate
 */
function validateAttributes(config: HBACConfig): void {
  if (config.attributes) {
    Object.entries(config.attributes).forEach(([attrName, attr]) => {
      // Type assertion to resolve 'unknown' type
      const typedAttr = attr as Attribute;

      if (!typedAttr.id) {
        throw new Error(`Attribute "${attrName}" must have a unique identifier`);
      }

      if (!typedAttr.type) {
        throw new Error(`Attribute "${attrName}" must have a type`);
      }

      // Validate attribute type
      const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
      if (!validTypes.includes(typedAttr.type)) {
        throw new Error(`Invalid attribute type for "${attrName}": ${typedAttr.type}`);
      }
    });
  }
}

/**
 * Validates policy rule configurations
 * 
 * @param config Configuration to validate
 */
function validatePolicyRules(config: HBACConfig): void {
  if (config.policyRules) {
    config.policyRules.forEach(rule => {
      if (!rule.id) {
        throw new Error('Each policy rule must have a unique identifier');
      }

      if (!rule.resource) {
        throw new Error(`Policy rule "${rule.id}" must specify a resource`);
      }

      if (!rule.action) {
        throw new Error(`Policy rule "${rule.id}" must specify an action`);
      }

      if (!rule.effect) {
        throw new Error(`Policy rule "${rule.id}" must specify an effect`);
      }

      // Validate effect
      if (!['allow', 'deny'].includes(rule.effect)) {
        throw new Error(`Invalid effect for policy rule "${rule.id}": ${rule.effect}`);
      }

      // Validate condition
      if (!rule.condition || typeof rule.condition !== 'object') {
        throw new Error(`Policy rule "${rule.id}" must have a valid condition object`);
      }
    });
  }
}