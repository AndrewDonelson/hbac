// file: src/interfaces/database.ts
// description: Database connector interface definition for the HBAC package

import { RoleId } from '../types/role';
import { AttributeId, AttributeValue } from '../types/attribute';
import { UserAccessMap } from '../types/database';

/**
 * Database connector interface for HBAC
 * Provides methods for accessing and manipulating user access data
 */
export interface DatabaseConnector {
  /**
   * Initializes the database connection
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;
  
  /**
   * Gets the roles assigned to a user
   * @param userId - User identifier
   * @returns Promise resolving to an array of role IDs
   */
  getUserRoles(userId: string): Promise<RoleId[]>;
  
  /**
   * Gets the attributes for a user
   * @param userId - User identifier
   * @returns Promise resolving to a map of attribute IDs to values
   */
  getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>>;
  
  /**
   * Assigns a role to a user
   * @param userId - User identifier
   * @param roleId - Role identifier
   * @returns Promise that resolves when the role is assigned
   */
  assignRole(userId: string, roleId: RoleId): Promise<void>;
  
  /**
   * Removes a role from a user
   * @param userId - User identifier
   * @param roleId - Role identifier
   * @returns Promise that resolves when the role is removed
   */
  removeRole(userId: string, roleId: RoleId): Promise<void>;
  
  /**
   * Sets an attribute value for a user
   * @param userId - User identifier
   * @param attributeId - Attribute identifier
   * @param value - Attribute value
   * @returns Promise that resolves when the attribute is set
   */
  setAttribute(userId: string, attributeId: AttributeId, value: AttributeValue): Promise<void>;
  
  /**
   * Gets the complete access map for a user
   * @param userId - User identifier
   * @returns Promise resolving to the user access map or null if not found
   */
  getUserAccessMap(userId: string): Promise<UserAccessMap | null>;
}