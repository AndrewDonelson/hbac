// file: src/db/convex/connector.ts
// description: Convex database connector implementation for storing and retrieving user access information

import { ConvexClient } from 'convex/browser';
import { BaseDatabaseConnector } from '../base';
import { RoleId } from '../../types/role';
import { AttributeId, AttributeValue } from '../../types/attribute';
import { UserAccessMap } from '../../types/database';
import { DatabaseConfig } from '../../interfaces/config';

/**
 * Convex database connector for HBAC user access management
 * 
 * Implements database operations for user roles, attributes, and access maps
 * using the Convex serverless database platform
 */
export class ConvexDatabaseConnector extends BaseDatabaseConnector {
  /**
   * Convex client for database interactions
   */
  private client: ConvexClient;

  /**
   * Name of the table storing user access maps
   */
  private tableName: string;

  /**
   * Initialization status of the connector
   */
  private initialized = false;

  /**
   * Creates a new ConvexDatabaseConnector instance
   * 
   * @param config Database configuration settings
   * @param convexClient Optional existing Convex client
   * @throws {Error} If no valid connection method is provided
   */
  constructor(
    private config: DatabaseConfig,
    convexClient?: ConvexClient
  ) {
    super();
    this.tableName = config.tableName || 'user_access_map';
    
    if (convexClient) {
      this.client = convexClient;
    } else if (config.connectionString) {
      this.client = new ConvexClient(config.connectionString);
    } else {
      throw new Error('Convex connection requires either a client or connection string');
    }
  }

  /**
   * Initializes the Convex database connector
   * 
   * @throws {Error} If initialization fails
   */
  public async initialize(): Promise<void> {
    try {
      // Use a predicate to check basic connectivity
      const connectionTest = await this.client.mutation('system.noop');
      
      // Mark as initialized if no error is thrown
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw new Error(`Failed to initialize Convex connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensures the connector has been initialized
   * 
   * @throws {Error} If the connector is not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Convex database connector has not been initialized');
    }
  }

  /**
   * Retrieves roles for a specific user
   * 
   * @param userId Unique user identifier
   * @returns Promise resolving to an array of role identifiers
   */
  public async getUserRoles(userId: string): Promise<RoleId[]> {
    this.ensureInitialized();
    
    try {
      const result = await this.client.query('hbac:getUserRoles', { userId });
      return result || [];
    } catch (error) {
      throw new Error(`Failed to retrieve user roles: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves attributes for a specific user
   * 
   * @param userId Unique user identifier
   * @returns Promise resolving to a map of attribute identifiers and values
   */
  public async getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>> {
    this.ensureInitialized();
    
    try {
      const result = await this.client.query('hbac:getUserAttributes', { userId });
      return result || {};
    } catch (error) {
      throw new Error(`Failed to retrieve user attributes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Assigns a role to a user
   * 
   * @param userId Unique user identifier
   * @param roleId Role identifier to assign
   */
  public async assignRole(userId: string, roleId: RoleId): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.client.mutation('hbac:assignRole', { userId, roleId });
    } catch (error) {
      throw new Error(`Failed to assign role: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Removes a role from a user
   * 
   * @param userId Unique user identifier
   * @param roleId Role identifier to remove
   */
  public async removeRole(userId: string, roleId: RoleId): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.client.mutation('hbac:removeRole', { userId, roleId });
    } catch (error) {
      throw new Error(`Failed to remove role: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sets an attribute value for a user
   * 
   * @param userId Unique user identifier
   * @param attributeId Attribute identifier
   * @param value Attribute value to set
   */
  public async setAttribute(
    userId: string, 
    attributeId: AttributeId, 
    value: AttributeValue
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.client.mutation('hbac:setAttribute', { userId, attributeId, value });
    } catch (error) {
      throw new Error(`Failed to set attribute: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves the complete access map for a user
   * 
   * @param userId Unique user identifier
   * @returns Promise resolving to the user's access map or null if not found
   */
  public async getUserAccessMap(userId: string): Promise<UserAccessMap | null> {
    this.ensureInitialized();
    
    try {
      const result = await this.client.query('hbac:getUserAccessMap', { userId });
      return result || null;
    } catch (error) {
      throw new Error(`Failed to retrieve user access map: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}