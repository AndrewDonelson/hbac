// file: src/types/config.ts
// description: Configuration-related type definitions for the HBAC package

/**
 * Type of database to use for storage
 */
export type DatabaseType = 'lowdb' | 'convex' | 'mongodb' | 'postgres';

/**
 * Audit log levels
 */
export type AuditLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Types of policy evaluation algorithms
 */
export type PolicyEvaluationType = 'firstApplicable' | 'allApplicable' | 'denyOverrides';

/**
 * Policy effect (allow or deny)
 */
export type PolicyEffect = 'allow' | 'deny';

/**
 * Types of attribute values
 */
export type AttributeType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/**
 * Permission action
 */
export type PermissionAction = string;

/**
 * Permission resource
 */
export type PermissionResource = string;

/**
 * Permission format (resource:action)
 */
export type Permission = `${PermissionResource}:${PermissionAction}` | '*:*';