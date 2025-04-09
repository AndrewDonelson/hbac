// file: src/db/convex/connector.ts
// description: Convex database connector implementation for storing and retrieving user access information

import { BaseDatabaseConnector } from '../base';
import { RoleId } from '../../types/role';
import { AttributeId, AttributeValue } from '../../types/attribute';
import { UserAccessMap } from '../../types/database';
import { DatabaseConfig } from '../../interfaces/config';

/**
 * A minimal interface for Convex client operations to avoid type errors
 */
interface MinimalConvexClient {
  // Use any to accommodate both string-based and reference-based APIs
  query: (action: any, args: Record<string, any>) => Promise<any>;
  mutation: (action: any, args: Record<string, any>) => Promise<any>;
}

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
  private client: MinimalConvexClient;

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
    convexClient?: any
  ) {
    super();
    this.tableName = config.tableName || 'user_access_map';
    
    if (convexClient) {
      // Use the provided client
      this.client = convexClient as MinimalConvexClient;
    } else if (config.connectionString) {
      try {
        // Try to dynamically load Convex
        const convex = require('convex/browser');
        this.client = new convex.ConvexClient(config.connectionString);
      } catch (error) {
        throw new Error(`Failed to load Convex client: ${error instanceof Error ? error.message : String(error)}`);
      }
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
      // Use a basic operation to test connection
      // Note: We provide an empty object for the args parameter
      await this.client.mutation('system.noop', {});
      
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
      // We use the query name as any to satisfy TypeScript
      const result = await this.client.query('hbac.getUserRoles' as any, { userId });
      return result || [];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
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
      const result = await this.client.query('hbac.getUserAttributes' as any, { userId });
      return result || {};
    } catch (error) {
      console.error('Error getting user attributes:', error);
      return {};
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
      await this.client.mutation('hbac.assignRole' as any, { userId, roleId });
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
      await this.client.mutation('hbac.removeRole' as any, { userId, roleId });
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
      await this.client.mutation('hbac.setAttribute' as any, { userId, attributeId, value });
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
      const result = await this.client.query('hbac.getUserAccessMap' as any, { userId });
      return result || null;
    } catch (error) {
      console.error('Error getting user access map:', error);
      return null;
    }
  }
}