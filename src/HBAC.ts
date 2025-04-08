// file: src/HBAC.ts
// description: Main HBAC class that coordinates all components of the access control system

import { HBACConfig } from './interfaces/config';
import { ConfigManager } from './config/manager';
import { DatabaseConnector } from './interfaces/database';
import { ConvexDatabaseConnector } from './db/convex/connector';
import { RoleManager } from './role/manager';
import { AttributeManager } from './attribute/manager';
import { PolicyEngine } from './policy/engine';
import { CacheManager } from './cache/manager';
import { RoleId } from './types/role';
import { AttributeId, AttributeValue } from './types/attribute';
import { ConvexClient } from 'convex/client';

interface HBACOptions {
  convexClient?: ConvexClient;
}

/**
 * Hybrid-Based Access Control (HBAC) main class
 * 
 * This class provides a comprehensive access control system that combines 
 * Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC)
 * 
 * @class HBAC
 */
export class HBAC {
  private configManager: ConfigManager;
  private config: HBACConfig | null = null;
  private dbConnector: DatabaseConnector | null = null;
  private roleManager: RoleManager | null = null;
  private attributeManager: AttributeManager | null = null;
  private policyEngine: PolicyEngine | null = null;
  private cacheManager: CacheManager | null = null;
  private initialized = false;

  /**
   * Creates a new HBAC instance
   * 
   * @param {string} configPath - Path to the HBAC configuration file
   */
  constructor(private configPath: string) {
    this.configManager = new ConfigManager(configPath);
  }

  /**
   * Initializes the HBAC system with configuration and components
   * 
   * @param {HBACOptions} [options] - Optional initialization options
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
      
      // Initialize database connector
      if (this.config.database.type === 'convex') {
        this.dbConnector = new ConvexDatabaseConnector(
          this.config.database,
          options?.convexClient
        );
      } else {
        throw new Error(`Unsupported database type: ${this.config.database.type}`);
      }
      
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
      throw new Error(`Failed to initialize HBAC: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

 /**
  * Checks if a user has permission to perform an action on a resource
  * @param userId User ID
  * @param action Action to check
  * @param resource Resource to check
  * @param context Optional context data
  * @returns Whether the action is allowed
  * @throws Error if HBAC is not initialized or if access is denied
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
  * Checks if a user has permission to perform an action on a resource
  * @param userId User ID
  * @param action Action to check
  * @param resource Resource to check
  * @param context Optional context data
  * @returns Whether the action is allowed
  * @throws Error if HBAC is not initialized
  */
 public async can(
   userId: string,
   action: string,
   resource: string,
   context: Record<string, any> = {}
 ): Promise<boolean> {
   this.checkInitialized();
   
   // Check cache first
   const cacheKey = `${userId}:${resource}:${action}:${JSON.stringify(context)}`;
   const cachedDecision = this.cacheManager!.getPermissionDecision(cacheKey);
   
   if (cachedDecision !== null) {
     return cachedDecision;
   }
   
   // Get user roles and attributes
   const [userRoles, userAttributes] = await Promise.all([
     this.getUserRoles(userId),
     this.getUserAttributes(userId)
   ]);
   
   // Evaluate permission
   const allowed = this.policyEngine!.evaluate(
     userRoles,
     userAttributes,
     resource,
     action,
     context
   );
   
   // Cache decision
   this.cacheManager!.setPermissionDecision(cacheKey, allowed);
   
   return allowed;
 }

 /**
  * Gets the roles for a user
  * @param userId User ID
  * @returns Array of role IDs
  * @throws Error if HBAC is not initialized
  */
 public async getUserRoles(userId: string): Promise<RoleId[]> {
   this.checkInitialized();
   
   // Check cache first
   const cachedRoles = this.cacheManager!.getUserRoles(userId);
   
   if (cachedRoles !== null) {
     return cachedRoles;
   }
   
   // Get from database
   const roles = await this.dbConnector!.getUserRoles(userId);
   
   // Cache roles
   this.cacheManager!.setUserRoles(userId, roles);
   
   return roles;
 }

 /**
  * Gets the attributes for a user
  * @param userId User ID
  * @returns Map of attribute IDs to values
  * @throws Error if HBAC is not initialized
  */
 public async getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>> {
   this.checkInitialized();
   
   // Check cache first
   const cachedAttributes = this.cacheManager!.getUserAttributes(userId);
   
   if (cachedAttributes !== null) {
     return cachedAttributes;
   }
   
   // Get from database
   const attributes = await this.dbConnector!.getUserAttributes(userId);
   
   // Cache attributes
   this.cacheManager!.setUserAttributes(userId, attributes);
   
   return attributes;
 }

 /**
  * Assigns a role to a user
  * @param userId User ID
  * @param roleId Role ID
  * @throws Error if HBAC is not initialized or if the role is invalid
  */
 public async assignRole(userId: string, roleId: RoleId): Promise<void> {
   this.checkInitialized();
   
   // Validate role
   const role = this.roleManager!.getRole(roleId);
   
   if (!role) {
     throw new Error(`Invalid role ID: ${roleId}`);
   }
   
   // Assign role
   await this.dbConnector!.assignRole(userId, roleId);
   
   // Invalidate cache
   this.cacheManager!.invalidateUser(userId);
 }

 /**
  * Removes a role from a user
  * @param userId User ID
  * @param roleId Role ID
  * @throws Error if HBAC is not initialized
  */
 public async removeRole(userId: string, roleId: RoleId): Promise<void> {
   this.checkInitialized();
   
   // Remove role
   await this.dbConnector!.removeRole(userId, roleId);
   
   // Invalidate cache
   this.cacheManager!.invalidateUser(userId);
 }

 /**
  * Sets an attribute for a user
  * @param userId User ID
  * @param attributeId Attribute ID
  * @param value Attribute value
  * @throws Error if HBAC is not initialized or if the attribute is invalid
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
   
   // Validate value
   if (!this.attributeManager!.validateAttributeValue(attributeId, value)) {
     throw new Error(`Invalid value for attribute ${attributeId}`);
   }
   
   // Set attribute
   await this.dbConnector!.setAttribute(userId, attributeId, value);
   
   // Invalidate cache
   this.cacheManager!.invalidateUser(userId);
 }

 /**
  * Checks if HBAC is initialized
  * @throws Error if HBAC is not initialized
  */
 private checkInitialized(): void {
   if (!this.initialized) {
     throw new Error('HBAC not initialized');
   }
 }
}