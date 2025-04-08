// file: src/HBAC.ts
// description: Main HBAC class that coordinates all components of the access control system

/* Usage:
const hbac = new HBAC('./hbac.config.json');
await hbac.initialize(); // Automatically uses the database type specified in config

const canRead = await hbac.can('user123', 'read', 'posts');
await hbac.assignRole('user123', 'role_editor');
await hbac.setAttribute('user123', 'department', 'Engineering');
*/
import { HBACConfig } from './interfaces/config';
import { ConfigManager } from './config/manager';
import { DatabaseConnector } from './interfaces/database';
import { RoleManager } from './role/manager';
import { AttributeManager } from './attribute/manager';
import { PolicyEngine } from './policy/engine';
import { CacheManager } from './cache/manager';
import { RoleId } from './types/role';
import { AttributeId, AttributeValue } from './types/attribute';
import { ConvexClient } from 'convex/browser';

/**
 * Options for initializing HBAC
 */
interface HBACOptions {
  /**
   * Optional Convex client for Convex database connector
   */
  convexClient?: ConvexClient;
}

/**
 * Hybrid-Based Access Control (HBAC) main class
 * 
 * Provides a comprehensive access control system combining 
 * Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC)
 */
export class HBAC {
  /**
   * Configuration manager for loading HBAC settings
   */
  private configManager: ConfigManager;

  /**
   * Loaded HBAC configuration
   */
  private config: HBACConfig | null = null;

  /**
   * Database connector for user access management
   */
  private dbConnector: DatabaseConnector | null = null;

  /**
   * Manager for handling role-based permissions
   */
  private roleManager: RoleManager | null = null;

  /**
   * Manager for handling attribute-based conditions
   */
  private attributeManager: AttributeManager | null = null;

  /**
   * Engine for evaluating access control policies
   */
  private policyEngine: PolicyEngine | null = null;

  /**
   * Manager for caching access control decisions
   */
  private cacheManager: CacheManager | null = null;

  /**
   * Initialization status of the HBAC system
   */
  private initialized = false;

  /**
   * Creates a new HBAC instance
   * 
   * @param configPath Path to the HBAC configuration file
   */
  constructor(private configPath: string) {
    this.configManager = new ConfigManager(configPath);
  }

  /**
   * Dynamically loads the appropriate database connector
   * 
   * @param type Database type from configuration
   * @param options Optional initialization options
   * @returns Instantiated database connector
   */
  private async loadDatabaseConnector(
    type: string, 
    options?: HBACOptions
  ): Promise<DatabaseConnector> {
    switch (type) {
      case 'convex': {
        const { ConvexDatabaseConnector } = await import('./db/convex/connector');
        return new ConvexDatabaseConnector(
          this.config!.database,
          options?.convexClient
        );
      }
      case 'lowdb': {
        const { LowdbDatabaseConnector } = await import('./db/lowdb/connector');
        return new LowdbDatabaseConnector(this.config!.database);
      }
      case 'mongodb': {
        const { MongoDBDatabaseConnector } = await import('./db/mongodb/connector');
        return new MongoDBDatabaseConnector(this.config!.database);
      }
      case 'postgres': {
        const { PostgresDatabaseConnector } = await import('./db/postgres/connector');
        return new PostgresDatabaseConnector(this.config!.database);
      }
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * Initializes the HBAC system with configuration and components
   * 
   * @param options Optional initialization options
   * @throws {Error} If initialization fails
   */
  public async initialize(options?: HBACOptions): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load configuration
      this.config = await this.configManager.load();
      
      // Initialize cache
      this.cacheManager = new CacheManager(this.config.cache);
      
      // Initialize managers
      this.roleManager = new RoleManager(this.config.roles);
      this.attributeManager = new AttributeManager(this.config.attributes);
      
      // Dynamically load database connector
      this.dbConnector = await this.loadDatabaseConnector(
        this.config.database.type, 
        options
      );
      
      // Initialize database connector
      await this.dbConnector.initialize();
      
      // Initialize policy engine
      this.policyEngine = new PolicyEngine(
        this.config.policyRules,
        this.config.policies.defaultEffect,
        this.config.policies.evaluation,
        this.roleManager,
        this.attributeManager
      );
      
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw new Error(
        `Failed to initialize HBAC: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Checks if a user has permission to perform an action on a resource
   * 
   * @param userId User identifier
   * @param action Action to perform
   * @param resource Resource to access
   * @param context Additional context for permission check
   * @returns Promise resolving to boolean indicating permission
   * @throws {Error} If HBAC is not initialized
   */
  public async can(
    userId: string,
    action: string,
    resource: string,
    context: Record<string, any> = {}
  ): Promise<boolean> {
    this.checkInitialized();
    
    // Create a cache key based on the permission context
    const cacheKey = `${userId}:${resource}:${action}:${JSON.stringify(context)}`;
    
    // Check cache for existing permission decision
    const cachedDecision = this.cacheManager!.getPermissionDecision(cacheKey);
    
    if (cachedDecision !== null) {
      return cachedDecision;
    }
    
    // Retrieve user roles and attributes
    const [userRoles, userAttributes] = await Promise.all([
      this.getUserRoles(userId),
      this.getUserAttributes(userId)
    ]);
    
    // Evaluate permission using policy engine
    const allowed = this.policyEngine!.evaluate(
      userRoles,
      userAttributes,
      resource,
      action,
      context
    );
    
    // Cache the permission decision
    this.cacheManager!.setPermissionDecision(cacheKey, allowed);
    
    return allowed;
  }

  /**
   * Checks permission and throws an error if access is denied
   * 
   * @param userId User identifier
   * @param action Action to perform
   * @param resource Resource to access
   * @param context Additional context for permission check
   * @throws {Error} If access is denied or HBAC is not initialized
   */
  public async check(
    userId: string,
    action: string,
    resource: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    const allowed = await this.can(userId, action, resource, context);
    
    if (!allowed) {
      throw new Error('Access denied');
    }
  }

  /**
   * Retrieves roles for a specific user
   * 
   * @param userId User identifier
   * @returns Promise resolving to array of role identifiers
   * @throws {Error} If HBAC is not initialized
   */
  public async getUserRoles(userId: string): Promise<RoleId[]> {
    this.checkInitialized();
    
    // Check cache for user roles
    const cachedRoles = this.cacheManager!.getUserRoles(userId);
    
    if (cachedRoles !== null) {
      return cachedRoles;
    }
    
    // Retrieve roles from database
    const roles = await this.dbConnector!.getUserRoles(userId);
    
    // Cache retrieved roles
    this.cacheManager!.setUserRoles(userId, roles);
    
    return roles;
  }

  /**
   * Retrieves attributes for a specific user
   * 
   * @param userId User identifier
   * @returns Promise resolving to map of attribute identifiers and values
   * @throws {Error} If HBAC is not initialized
   */
  public async getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>> {
    this.checkInitialized();
    
    // Check cache for user attributes
    const cachedAttributes = this.cacheManager!.getUserAttributes(userId);
    
    if (cachedAttributes !== null) {
      return cachedAttributes;
    }
    
    // Retrieve attributes from database
    const attributes = await this.dbConnector!.getUserAttributes(userId);
    
    // Cache retrieved attributes
    this.cacheManager!.setUserAttributes(userId, attributes);
    
    return attributes;
  }

  /**
   * Assigns a role to a user
   * 
   * @param userId User identifier
   * @param roleId Role identifier
   * @throws {Error} If HBAC is not initialized or role is invalid
   */
  public async assignRole(userId: string, roleId: RoleId): Promise<void> {
    this.checkInitialized();
    
    // Validate role
    const role = this.roleManager!.getRole(roleId);
    
    if (!role) {
      throw new Error(`Invalid role ID: ${roleId}`);
    }
    
    // Assign role in database
    await this.dbConnector!.assignRole(userId, roleId);
    
    // Invalidate user cache
    this.cacheManager!.invalidateUser(userId);
  }

  /**
   * Removes a role from a user
   * 
   * @param userId User identifier
   * @param roleId Role identifier
   * @throws {Error} If HBAC is not initialized
   */
  public async removeRole(userId: string, roleId: RoleId): Promise<void> {
    this.checkInitialized();
    
    // Remove role from database
    await this.dbConnector!.removeRole(userId, roleId);
    
    // Invalidate user cache
    this.cacheManager!.invalidateUser(userId);
  }

  /**
   * Sets an attribute for a user
   * 
   * @param userId User identifier
   * @param attributeId Attribute identifier
   * @param value Attribute value
   * @throws {Error} If HBAC is not initialized or attribute is invalid
   */
  public async setAttribute(
    userId: string,
    attributeId: AttributeId,
    value: AttributeValue
  ): Promise<void> {
    this.checkInitialized();
    
    // Validate attribute
    const attribute = this.attributeManager!.getAttribute(attributeId);
    
    if (!attribute) {
      throw new Error(`Invalid attribute ID: ${attributeId}`);
    }
    
    // Validate attribute value
    if (!this.attributeManager!.validateAttributeValue(attributeId, value)) {
      throw new Error(`Invalid value for attribute ${attributeId}`);
    }
    
    // Set attribute in database
    await this.dbConnector!.setAttribute(userId, attributeId, value);
    
    // Invalidate user cache
    this.cacheManager!.invalidateUser(userId);
  }

  /**
   * Ensures HBAC system is initialized
   * 
   * @throws {Error} If HBAC is not initialized
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('HBAC not initialized. Call initialize() first.');
    }
  }
}