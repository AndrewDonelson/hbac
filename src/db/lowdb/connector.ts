// file: src/db/lowdb/connector.ts
// description: Lowdb database connector for local file-based storage and testing

import { writeFile, readFile, access } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BaseDatabaseConnector } from '../base';
import { RoleId } from '../../types/role';
import { AttributeId, AttributeValue } from '../../types/attribute';
import { UserAccessMap } from '../../types/database';
import { DatabaseConfig } from '../../interfaces/config';

/**
 * Schema for the file-based database
 */
interface DatabaseSchema {
  user_access_map: UserAccessMap[];
}

/**
 * File-based database connector for access control storage
 */
export class LowdbDatabaseConnector extends BaseDatabaseConnector {
  /**
   * Path to the database file
   */
  private filePath: string;

  /**
   * In-memory database state
   */
  private data: DatabaseSchema = { user_access_map: [] };

  /**
   * Creates a new LowdbDatabaseConnector instance
   * 
   * @param config Database configuration
   */
  constructor(private config: DatabaseConfig) {
    super();
    
    // Determine the file path for the database
    const defaultPath = path.resolve(process.cwd(), 'hbac_access_map.json');
    this.filePath = config.connectionString || defaultPath;
  }

  /**
   * Initializes the database connector
   * Ensures the database file exists and is readable
   */
  public async initialize(): Promise<void> {
    try {
      // Check if file exists, create if not
      await access(this.filePath).catch(async () => {
        // File doesn't exist, create with default structure
        await this.writeDatabase({ user_access_map: [] });
      });

      // Read existing data
      await this.readDatabase();
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Reads the database from file
   */
  private async readDatabase(): Promise<void> {
    try {
      const rawData = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(rawData);
    } catch (error) {
      // If read fails, reset to empty state
      this.data = { user_access_map: [] };
      await this.writeDatabase(this.data);
    }
  }

  /**
   * Writes the database to file
   * 
   * @param data Database schema to write
   */
  private async writeDatabase(data: DatabaseSchema): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Retrieves roles for a specific user
   * 
   * @param userId Unique user identifier
   * @returns Array of role identifiers
   */
  public async getUserRoles(userId: string): Promise<RoleId[]> {
    await this.readDatabase();
    
    const record = this.data.user_access_map.find(
      entry => entry.userId === userId
    );
    
    return record?.roleIds || [];
  }

  /**
   * Retrieves attributes for a specific user
   * 
   * @param userId Unique user identifier
   * @returns Map of attribute identifiers and values
   */
  public async getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>> {
    await this.readDatabase();
    
    const record = this.data.user_access_map.find(
      entry => entry.userId === userId
    );
    
    return record?.attributes || {};
  }

  /**
   * Assigns a role to a user
   * 
   * @param userId Unique user identifier
   * @param roleId Role identifier to assign
   */
  public async assignRole(userId: string, roleId: RoleId): Promise<void> {
    await this.readDatabase();

    // Find existing user record or create new one
    let record = this.data.user_access_map.find(
      entry => entry.userId === userId
    );

    if (!record) {
      // Create new user access map entry
      record = {
        id: uuidv4(),
        userId,
        roleIds: [roleId],
        attributes: {}
      };
      this.data.user_access_map.push(record);
    } else {
      // Add role if not already present
      if (!record.roleIds.includes(roleId)) {
        record.roleIds.push(roleId);
      }
    }

    // Write changes
    await this.writeDatabase(this.data);
  }

  /**
   * Removes a role from a user
   * 
   * @param userId Unique user identifier
   * @param roleId Role identifier to remove
   */
  public async removeRole(userId: string, roleId: RoleId): Promise<void> {
    await this.readDatabase();

    // Find the user record
    const userIndex = this.data.user_access_map.findIndex(
      entry => entry.userId === userId
    );

    if (userIndex !== -1) {
      // Remove the specific role
      this.data.user_access_map[userIndex].roleIds = 
        this.data.user_access_map[userIndex].roleIds.filter(
          role => role !== roleId
        );

      // Write changes
      await this.writeDatabase(this.data);
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
    await this.readDatabase();

    // Find existing user record or create new one
    let record = this.data.user_access_map.find(
      entry => entry.userId === userId
    );

    if (!record) {
      // Create new user access map entry
      record = {
        id: uuidv4(),
        userId,
        roleIds: [],
        attributes: { [attributeId]: value }
      };
      this.data.user_access_map.push(record);
    } else {
      // Set or update attribute
      record.attributes[attributeId] = value;
    }

    // Write changes
    await this.writeDatabase(this.data);
  }

  /**
   * Retrieves the complete access map for a user
   * 
   * @param userId Unique user identifier
   * @returns User access map or null if not found
   */
  public async getUserAccessMap(userId: string): Promise<UserAccessMap | null> {
    await this.readDatabase();
    
    const record = this.data.user_access_map.find(
      entry => entry.userId === userId
    );
    
    return record || null;
  }
}