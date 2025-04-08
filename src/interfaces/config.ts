// file: src/interfaces/config.ts
// description: Configuration-related interface definitions for the HBAC package

import {
  DatabaseType,
  AuditLevel,
  PolicyEvaluationType,
  PolicyEffect
} from '../types/config';
import { RoleMap } from '../types/role';
import { AttributeMap } from '../types/attribute';
import { PolicyRule } from '../types/policy';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  /**
   * Type of database to use
   */
  type: DatabaseType;

  /**
   * Name of the table to use for storing access maps
   */
  tableName?: string;

  /**
   * Connection string for the database
   */
  connectionString?: string;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  /**
   * Whether caching is enabled
   */
  enabled: boolean;

  /**
   * Time-to-live in seconds for cached entries
   */
  ttl: number;
}

/**
 * Audit configuration interface
 */
export interface AuditConfig {
  /**
   * Whether audit logging is enabled
   */
  enabled: boolean;

  /**
   * Log level for audit events
   */
  level: AuditLevel;
}

/**
 * Policy configuration interface
 */
export interface PolicyConfig {
  /**
   * Default effect when no policy matches
   */
  defaultEffect: PolicyEffect;

  /**
   * Policy evaluation algorithm
   */
  evaluation: PolicyEvaluationType;
}

/**
 * Main HBAC configuration interface
 */
export interface HBACConfig {
  /**
   * Configuration version
   */
  version: string;

  /**
   * Database configuration
   */
  database: DatabaseConfig;

  /**
   * Cache configuration
   */
  cache: CacheConfig;

  /**
   * Audit configuration
   */
  audit: AuditConfig;

  /**
   * Policy configuration
   */
  policies: PolicyConfig;

  /**
   * Role definitions
   */
  roles: RoleMap;

  /**
   * Attribute definitions
   */
  attributes: AttributeMap;

  /**
   * Policy rules
   */
  policyRules: PolicyRule[];
}