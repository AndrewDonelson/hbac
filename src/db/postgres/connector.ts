// file: src/db/postgres/connector.ts
// description: PostgreSQL database connector for storing and retrieving user access information

import { BaseDatabaseConnector } from '../base';
import { RoleId } from '../../types/role';
import { AttributeId, AttributeValue } from '../../types/attribute';
import { UserAccessMap } from '../../types/database';
import { DatabaseConfig } from '../../interfaces/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * PostgreSQL database connector for HBAC user access management
 */
export class PostgresDatabaseConnector extends BaseDatabaseConnector {
  private pool: any;
  private tableName: string;
  private pg: any;

  /**
   * Creates a new PostgreSQL database connector
   * 
   * @param config Database configuration
   */
  constructor(private config: DatabaseConfig) {
    super();
    
    if (!config.connectionString) {
      throw new Error('PostgreSQL connection string is required');
    }

    this.tableName = config.tableName || 'user_access_map';
    
    try {
      // Dynamic import of pg
      this.pg = require('pg');
      this.pool = new this.pg.Pool({ connectionString: config.connectionString });
    } catch (error) {
      throw new Error(`Failed to load PostgreSQL library: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initializes the PostgreSQL connector
   */
  public async initialize(): Promise<void> {
    try {
      // Create table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          role_ids TEXT[] DEFAULT '{}',
          attributes JSONB DEFAULT '{}'
        )
      `);
    } catch (error) {
      throw new Error(`Failed to initialize PostgreSQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves roles for a specific user
   */
  public async getUserRoles(userId: string): Promise<RoleId[]> {
    const result = await this.pool.query(
      `SELECT role_ids FROM ${this.tableName} WHERE user_id = $1`,
      [userId]
    );
    
    return result.rows[0]?.role_ids || [];
  }

  /**
   * Retrieves attributes for a specific user
   */
  public async getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>> {
    const result = await this.pool.query(
      `SELECT attributes FROM ${this.tableName} WHERE user_id = $1`,
      [userId]
    );
    
    return result.rows[0]?.attributes || {};
  }

  /**
   * Assigns a role to a user
   */
  public async assignRole(userId: string, roleId: RoleId): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO ${this.tableName} (id, user_id, role_ids)
        VALUES ($1, $2, ARRAY[$3]::TEXT[])
        ON CONFLICT (user_id) DO
        UPDATE SET role_ids = ARRAY_APPEND(${this.tableName}.role_ids, $3)
      `,
      [uuidv4(), userId, roleId]
    );
  }

  /**
   * Removes a role from a user
   */
  public async removeRole(userId: string, roleId: RoleId): Promise<void> {
    await this.pool.query(
      `
        UPDATE ${this.tableName}
        SET role_ids = ARRAY_REMOVE(role_ids, $1)
        WHERE user_id = $2
      `,
      [roleId, userId]
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
    await this.pool.query(
      `
        INSERT INTO ${this.tableName} (id, user_id, attributes)
        VALUES ($1, $2, $3::JSONB)
        ON CONFLICT (user_id) DO
        UPDATE SET attributes = jsonb_set(
          ${this.tableName}.attributes, 
          ARRAY[$4], 
          $5::JSONB
        )
      `,
      [
        uuidv4(), 
        userId, 
        JSON.stringify({ [attributeId]: value }),
        `{${attributeId}}`,
        JSON.stringify(value)
      ]
    );
  }

  /**
   * Retrieves the complete access map for a user
   */
  public async getUserAccessMap(userId: string): Promise<UserAccessMap | null> {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1`,
      [userId]
    );
    
    return result.rows[0] ? {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      roleIds: result.rows[0].role_ids,
      attributes: result.rows[0].attributes
    } : null;
  }

  /**
   * Closes the database connection
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}