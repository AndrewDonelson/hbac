// file: src/db/base.ts
// description: Base abstract class for database connectors defining the common interface for all database implementations

import { DatabaseConnector } from '../interfaces/database';
import { RoleId } from '../types/role';
import { AttributeId, AttributeValue } from '../types/attribute';
import { UserAccessMap } from '../types/database';

/**
 * Abstract base class for database connectors
 * 
 * Provides a standard interface for database operations related to user access control
 * Implementations must provide concrete methods for each database-specific operation
 */
export abstract class BaseDatabaseConnector implements DatabaseConnector {
  /**
   * Initializes the database connector
   * 
   * @throws {Error} If initialization fails
   */
  public abstract initialize(): Promise<void>;
  
  /**
   * Retrieves roles for a specific user
   * 
   * @param userId Unique identifier for the user
   * @returns Promise resolving to an array of role identifiers
   */
  public abstract getUserRoles(userId: string): Promise<RoleId[]>;
  
  /**
   * Retrieves attributes for a specific user
   * 
   * @param userId Unique identifier for the user
   * @returns Promise resolving to a map of attribute identifiers and their values
   */
  public abstract getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>>;
  
  /**
   * Assigns a role to a user
   * 
   * @param userId Unique identifier for the user
   * @param roleId Identifier of the role to assign
   * @throws {Error} If role assignment fails
   */
  public abstract assignRole(userId: string, roleId: RoleId): Promise<void>;
  
  /**
   * Removes a role from a user
   * 
   * @param userId Unique identifier for the user
   * @param roleId Identifier of the role to remove
   * @throws {Error} If role removal fails
   */
  public abstract removeRole(userId: string, roleId: RoleId): Promise<void>;
  
  /**
   * Sets an attribute value for a user
   * 
   * @param userId Unique identifier for the user
   * @param attributeId Identifier of the attribute
   * @param value Value to set for the attribute
   * @throws {Error} If attribute setting fails
   */
  public abstract setAttribute(
    userId: string, 
    attributeId: AttributeId, 
    value: AttributeValue
  ): Promise<void>;
  
  /**
   * Retrieves the complete access map for a user
   * 
   * @param userId Unique identifier for the user
   * @returns Promise resolving to the user's access map or null if not found
   */
  public abstract getUserAccessMap(userId: string): Promise<UserAccessMap | null>;
}