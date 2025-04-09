// file: src/db/memory/connector.ts
// description: In-memory database connector for development and fallback when other connectors are unavailable

import { BaseDatabaseConnector } from '../base';
import { RoleId } from '../../types/role';
import { AttributeId, AttributeValue } from '../../types/attribute';
import { UserAccessMap } from '../../types/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory database storage interface
 */
interface MemoryStorage {
  users: Map<string, UserAccessMap>;
}

/**
 * In-memory database connector for quick setup and testing
 * Also serves as a fallback when other database connectors are unavailable
 */
export class InMemoryDatabaseConnector extends BaseDatabaseConnector {
  /**
   * In-memory storage
   */
  private storage: MemoryStorage = {
    users: new Map<string, UserAccessMap>()
  };

  /**
   * Creates a new InMemoryDatabaseConnector
   */
  constructor() {
    super();
    console.warn('Using in-memory database storage. Data will be lost when the application restarts.');
  }

  /**
   * Initializes the in-memory database
   */
  public async initialize(): Promise<void> {
    // Nothing to initialize for in-memory storage
  }

  /**
   * Gets roles for a user
   */
  public async getUserRoles(userId: string): Promise<RoleId[]> {
    const user = this.storage.users.get(userId);
    return user?.roleIds || [];
  }

  /**
   * Gets attributes for a user
   */
  public async getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>> {
    const user = this.storage.users.get(userId);
    return user?.attributes || {};
  }

  /**
   * Assigns a role to a user
   */
  public async assignRole(userId: string, roleId: RoleId): Promise<void> {
    const user = this.storage.users.get(userId);
    
    if (user) {
      // Add role if not already assigned
      if (!user.roleIds.includes(roleId)) {
        user.roleIds.push(roleId);
      }
    } else {
      // Create new user
      this.storage.users.set(userId, {
        id: uuidv4(),
        userId,
        roleIds: [roleId],
        attributes: {}
      });
    }
  }

  /**
   * Removes a role from a user
   */
  public async removeRole(userId: string, roleId: RoleId): Promise<void> {
    const user = this.storage.users.get(userId);
    
    if (user) {
      user.roleIds = user.roleIds.filter(id => id !== roleId);
    }
  }

  /**
   * Sets an attribute for a user
   */
  public async setAttribute(
    userId: string,
    attributeId: AttributeId,
    value: AttributeValue
  ): Promise<void> {
    let user = this.storage.users.get(userId);
    
    if (user) {
      user.attributes[attributeId] = value;
    } else {
      // Create new user
      user = {
        id: uuidv4(),
        userId,
        roleIds: [],
        attributes: { [attributeId]: value }
      };
      this.storage.users.set(userId, user);
    }
  }

  /**
   * Gets the complete access map for a user
   */
  public async getUserAccessMap(userId: string): Promise<UserAccessMap | null> {
    return this.storage.users.get(userId) || null;
  }
}