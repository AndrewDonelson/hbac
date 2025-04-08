// file: src/types/database.ts
// description: Database-related type definitions for the HBAC package

import { RoleId } from './role';
import { AttributeValues } from './attribute';

/**
 * User access map interface representing the stored user permissions data
 */
export interface UserAccessMap {
  /**
   * Unique identifier for the user access map entry
   */
  id: string;
  
  /**
   * User identifier
   */
  userId: string;
  
  /**
   * Array of role IDs assigned to the user
   */
  roleIds: RoleId[];
  
  /**
   * Map of attribute IDs to their values for the user
   */
  attributes: AttributeValues;
}