// file: src/db/mongodb/connector.ts
// description: MongoDB database connector for storing and retrieving user access information

import { MongoClient, Db, Collection } from 'mongodb';
import { BaseDatabaseConnector } from '../base';
import { RoleId } from '../../types/role';
import { AttributeId, AttributeValue } from '../../types/attribute';
import { UserAccessMap } from '../../types/database';
import { DatabaseConfig } from '../../interfaces/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * MongoDB database connector for HBAC user access management
 */
export class MongoDBDatabaseConnector extends BaseDatabaseConnector {
  private client: MongoClient;
  private db: Db | null = null;
  private collection: Collection | null = null;

  /**
   * Creates a new MongoDB database connector
   * 
   * @param config Database configuration
   */
  constructor(private config: DatabaseConfig) {
    super();
    
    if (!config.connectionString) {
      throw new Error('MongoDB connection string is required');
    }

    this.client = new MongoClient(config.connectionString);
  }

  /**
   * Initializes the MongoDB connector
   */
  public async initialize(): Promise<void> {
    try {
      await this.client.connect();
      
      // Use default database name or from config
      const dbName = this.config.tableName || 'hbac';
      this.db = this.client.db(dbName);
      
      // Use default collection name
      this.collection = this.db.collection('user_access_map');
    } catch (error) {
      throw new Error(`Failed to initialize MongoDB: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves roles for a specific user
   */
  public async getUserRoles(userId: string): Promise<RoleId[]> {
    this.ensureInitialized();
    
    const user = await this.collection!.findOne({ userId });
    return user?.roleIds || [];
  }

  /**
   * Retrieves attributes for a specific user
   */
  public async getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>> {
    this.ensureInitialized();
    
    const user = await this.collection!.findOne({ userId });
    return user?.attributes || {};
  }

  /**
   * Assigns a role to a user
   */
  public async assignRole(userId: string, roleId: RoleId): Promise<void> {
    this.ensureInitialized();
    
    await this.collection!.updateOne(
      { userId },
      { 
        $set: { userId },
        $addToSet: { roleIds: roleId }
      },
      { upsert: true }
    );
  }

  /**
   * Removes a role from a user
   */
  public async removeRole(userId: string, roleId: RoleId): Promise<void> {
    this.ensureInitialized();
    
    await this.collection!.updateOne(
      { userId },
      { $pull: { roleIds: roleId } }
    );
  }

  /**
   * Sets an attribute for a user
   */
  public async setAttribute(
    userId: string, 
    attributeId: AttributeId, 
    value: AttributeValue
  ): Promise<void> {
    this.ensureInitialized();
    
    await this.collection!.updateOne(
      { userId },
      { 
        $set: { 
          userId, 
          [`attributes.${attributeId}`]: value 
        }
      },
      { upsert: true }
    );
  }

  /**
   * Retrieves the complete access map for a user
   */
  public async getUserAccessMap(userId: string): Promise<UserAccessMap | null> {
    this.ensureInitialized();
    
    return await this.collection!.findOne({ userId });
  }

  /**
   * Ensures the connector is initialized
   */
  private ensureInitialized(): void {
    if (!this.collection) {
      throw new Error('MongoDB connector not initialized');
    }
  }

  /**
   * Closes the database connection
   */
  public async close(): Promise<void> {
    await this.client.close();
  }
}