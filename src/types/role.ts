// file: src/types/role.ts
// description: Role-related type definitions for the HBAC package

import { Permission } from './config';

/**
 * Role identifier type
 */
export type RoleId = string;

/**
 * Role definition interface
 */
export interface Role {
  /**
   * Unique identifier for the role
   */
  id: RoleId;
  
  /**
   * Optional description of the role
   */
  description?: string;
  
  /**
   * List of permissions assigned to this role
   */
  permissions: Permission[];
}

/**
 * Map of role keys to role definitions
 */
export type RoleMap = Record<string, Role>;