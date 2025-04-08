# HBAC Project Development Plan

## Project Setup

### 1. Initialize NPM Package

```bash
mkdir hbac
cd hbac
npm init -y
```

### 2. Install Required Dependencies

```bash
npm install --save typescript @types/node convex
npm install --save-dev jest ts-jest @types/jest eslint prettier eslint-config-prettier
```

### 3. TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

### 4. Package.json Configuration Update

```json
{
  "name": "hbac",
  "version": "0.1.0",
  "description": "Hybrid-Based Access Control for Node.js applications",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write 'src/**/*.ts'",
    "prepare": "npm run build"
  },
  "keywords": [
    "access-control",
    "rbac",
    "abac",
    "authorization",
    "permissions",
    "convex"
  ],
  "author": "Your Name",
  "license": "MIT"
}
```

## Project Structure

```
hbac/
├── src/
│   ├── types/                 # Type definitions
│   ├── interfaces/            # Interface definitions
│   ├── config/                # Configuration handling
│   ├── role/                  # Role management
│   ├── attribute/             # Attribute management
│   ├── policy/                # Policy engine
│   ├── cache/                 # Caching layer
│   ├── db/                    # Database connectors
│   │   ├── convex/            # Convex-specific implementation
│   │   └── base.ts            # Base database interface
│   ├── utils/                 # Utility functions
│   ├── middleware/            # Express/Next.js middleware
│   ├── react/                 # React integration components
│   ├── index.ts               # Main entry point
│   └── HBAC.ts                # Main HBAC class
├── examples/                  # Example implementations
│   ├── express/               # Express.js example
│   ├── nextjs/                # Next.js example
│   └── convex/                # Convex example
├── tests/                     # Test files
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Jest configuration
├── .eslintrc.js               # ESLint configuration
├── .prettierrc                # Prettier configuration
├── .gitignore                 # Git ignore file
├── README.md                  # Project documentation
└── package.json               # NPM package configuration
```

## Implementation Details

Let's go through each component of the implementation:

### 1. Type Definitions and Interfaces

Creating type definitions for our HBAC package:

#### src/types/index.ts

```typescript
export * from './config';
export * from './role';
export * from './attribute';
export * from './policy';
export * from './database';
```

#### src/types/config.ts

```typescript
export type DatabaseType = 'convex' | 'custom';
export type AuditLevel = 'error' | 'warn' | 'info' | 'debug';
export type PolicyEvaluationType = 'firstApplicable' | 'allApplicable' | 'denyOverrides';
export type PolicyEffect = 'allow' | 'deny';
export type AttributeType = 'string' | 'number' | 'boolean' | 'object' | 'array';
export type PermissionAction = string;
export type PermissionResource = string;
export type Permission = `${PermissionResource}:${PermissionAction}` | '*:*';
```

#### src/types/role.ts

```typescript
import { Permission } from './config';

export type RoleId = string;

export interface Role {
  id: RoleId;
  description?: string;
  permissions: Permission[];
}

export type RoleMap = Record<string, Role>;
```

#### src/types/attribute.ts

```typescript
import { AttributeType } from './config';

export type AttributeId = string;

export interface Attribute {
  id: AttributeId;
  type: AttributeType;
  description?: string;
}

export type AttributeMap = Record<string, Attribute>;
export type AttributeValue = string | number | boolean | object | any[];
export type AttributeValues = Record<AttributeId, AttributeValue>;
```

#### src/types/policy.ts

```typescript
import { PolicyEffect } from './config';

export type PolicyId = string;
export type PolicyCondition = Record<string, any>;

export interface PolicyRule {
  id: PolicyId;
  name?: string;
  description?: string;
  resource: string;
  action: string;
  condition: PolicyCondition;
  effect: PolicyEffect;
}
```

#### src/types/database.ts

```typescript
import { RoleId } from './role';
import { AttributeValues } from './attribute';

export interface UserAccessMap {
  id: string;
  userId: string;
  roleIds: RoleId[];
  attributes: AttributeValues;
}
```

#### src/interfaces/config.ts

```typescript
import { 
  DatabaseType, 
  AuditLevel, 
  PolicyEvaluationType, 
  PolicyEffect,
  RoleMap,
  AttributeMap,
  PolicyRule
} from '../types';

export interface DatabaseConfig {
  type: DatabaseType;
  tableName?: string;
  connectionString?: string;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
}

export interface AuditConfig {
  enabled: boolean;
  level: AuditLevel;
}

export interface PolicyConfig {
  defaultEffect: PolicyEffect;
  evaluation: PolicyEvaluationType;
}

export interface HBACConfig {
  version: string;
  database: DatabaseConfig;
  cache: CacheConfig;
  audit: AuditConfig;
  policies: PolicyConfig;
  roles: RoleMap;
  attributes: AttributeMap;
  policyRules: PolicyRule[];
}
```

#### src/interfaces/database.ts

```typescript
import { RoleId } from '../types/role';
import { AttributeId, AttributeValue } from '../types/attribute';
import { UserAccessMap } from '../types/database';

export interface DatabaseConnector {
  initialize(): Promise<void>;
  getUserRoles(userId: string): Promise<RoleId[]>;
  getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>>;
  assignRole(userId: string, roleId: RoleId): Promise<void>;
  removeRole(userId: string, roleId: RoleId): Promise<void>;
  setAttribute(userId: string, attributeId: AttributeId, value: AttributeValue): Promise<void>;
  getUserAccessMap(userId: string): Promise<UserAccessMap | null>;
}
```

### 2. Configuration Manager

#### src/config/manager.ts

```typescript
import fs from 'fs';
import path from 'path';
import { HBACConfig } from '../interfaces/config';
import { validateConfig } from './validator';

/**
 * Manages the HBAC configuration
 */
export class ConfigManager {
  private config: HBACConfig | null = null;
  private configPath: string;

  /**
   * Creates a new ConfigManager instance
   * @param configPath Path to the HBAC configuration file
   */
  constructor(configPath: string) {
    this.configPath = path.resolve(configPath);
  }

  /**
   * Loads and validates the configuration
   * @returns The parsed and validated configuration
   * @throws Error if the configuration is invalid
   */
  public async load(): Promise<HBACConfig> {
    try {
      // Read configuration file
      const rawConfig = await fs.promises.readFile(this.configPath, 'utf-8');
      const config: HBACConfig = JSON.parse(rawConfig);
      
      // Validate configuration
      validateConfig(config);
      
      this.config = config;
      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
      throw new Error('Failed to load configuration');
    }
  }

  /**
   * Gets the current configuration
   * @returns The current configuration
   * @throws Error if the configuration is not loaded
   */
  public getConfig(): HBACConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }
}
```

#### src/config/validator.ts

```typescript
import { HBACConfig } from '../interfaces/config';

/**
 * Validates the HBAC configuration
 * @param config The configuration to validate
 * @throws Error if the configuration is invalid
 */
export function validateConfig(config: HBACConfig): void {
  // Check required fields
  if (!config.version) {
    throw new Error('Configuration must include a version');
  }
  
  if (!config.database) {
    throw new Error('Configuration must include database settings');
  }
  
  if (!config.policies) {
    throw new Error('Configuration must include policy settings');
  }
  
  if (!config.roles || Object.keys(config.roles).length === 0) {
    throw new Error('Configuration must include at least one role');
  }
  
  // Validate roles
  for (const [roleName, role] of Object.entries(config.roles)) {
    if (!role.id) {
      throw new Error(`Role "${roleName}" must have an ID`);
    }
    
    if (!Array.isArray(role.permissions) || role.permissions.length === 0) {
      throw new Error(`Role "${roleName}" must have at least one permission`);
    }
  }
  
  // Validate attributes
  if (config.attributes) {
    for (const [attrName, attr] of Object.entries(config.attributes)) {
      if (!attr.id) {
        throw new Error(`Attribute "${attrName}" must have an ID`);
      }
      
      if (!attr.type) {
        throw new Error(`Attribute "${attrName}" must have a type`);
      }
    }
  }
  
  // Validate policy rules
  if (config.policyRules) {
    for (const rule of config.policyRules) {
      if (!rule.id) {
        throw new Error('Policy rule must have an ID');
      }
      
      if (!rule.resource) {
        throw new Error(`Policy rule "${rule.id}" must have a resource`);
      }
      
      if (!rule.action) {
        throw new Error(`Policy rule "${rule.id}" must have an action`);
      }
      
      if (!rule.effect) {
        throw new Error(`Policy rule "${rule.id}" must have an effect`);
      }
    }
  }
}
```

### 3. Database Connectors

#### src/db/base.ts

```typescript
import { DatabaseConnector } from '../interfaces/database';
import { RoleId } from '../types/role';
import { AttributeId, AttributeValue } from '../types/attribute';
import { UserAccessMap } from '../types/database';

/**
 * Base class for database connectors
 */
export abstract class BaseDatabaseConnector implements DatabaseConnector {
  /**
   * Initializes the database connector
   */
  abstract initialize(): Promise<void>;
  
  /**
   * Gets the roles for a user
   * @param userId The user ID
   * @returns Array of role IDs
   */
  abstract getUserRoles(userId: string): Promise<RoleId[]>;
  
  /**
   * Gets the attributes for a user
   * @param userId The user ID
   * @returns Map of attribute IDs to values
   */
  abstract getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>>;
  
  /**
   * Assigns a role to a user
   * @param userId The user ID
   * @param roleId The role ID
   */
  abstract assignRole(userId: string, roleId: RoleId): Promise<void>;
  
  /**
   * Removes a role from a user
   * @param userId The user ID
   * @param roleId The role ID
   */
  abstract removeRole(userId: string, roleId: RoleId): Promise<void>;
  
  /**
   * Sets an attribute for a user
   * @param userId The user ID
   * @param attributeId The attribute ID
   * @param value The attribute value
   */
  abstract setAttribute(userId: string, attributeId: AttributeId, value: AttributeValue): Promise<void>;
  
  /**
   * Gets the complete access map for a user
   * @param userId The user ID
   * @returns The user access map or null if not found
   */
  abstract getUserAccessMap(userId: string): Promise<UserAccessMap | null>;
}
```

#### src/db/convex/connector.ts

```typescript
import { ConvexClient } from 'convex/client';
import { BaseDatabaseConnector } from '../base';
import { RoleId } from '../../types/role';
import { AttributeId, AttributeValue } from '../../types/attribute';
import { UserAccessMap } from '../../types/database';
import { DatabaseConfig } from '../../interfaces/config';

/**
 * Convex database connector
 */
export class ConvexDatabaseConnector extends BaseDatabaseConnector {
  private client: ConvexClient;
  private tableName: string;
  private initialized: boolean = false;

  /**
   * Creates a new ConvexDatabaseConnector
   * @param config Database configuration
   * @param convexClient Optional existing Convex client
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
      throw new Error('Convex connection string is required');
    }
  }

  /**
   * Initializes the database connector
   */
  async initialize(): Promise<void> {
    // Verify connection works
    try {
      // Simple ping/check operation
      await this.client._any(); // Note: using a hypothetical internal method
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Convex connection: ${error}`);
    }
  }

  /**
   * Gets the roles for a user
   * @param userId The user ID
   * @returns Array of role IDs
   */
  async getUserRoles(userId: string): Promise<RoleId[]> {
    this.checkInitialized();
    
    try {
      const result = await this.client.query('hbac:getUserRoles', { userId });
      return result || [];
    } catch (error) {
      throw new Error(`Failed to get user roles: ${error}`);
    }
  }

  /**
   * Gets the attributes for a user
   * @param userId The user ID
   * @returns Map of attribute IDs to values
   */
  async getUserAttributes(userId: string): Promise<Record<AttributeId, AttributeValue>> {
    this.checkInitialized();
    
    try {
      const result = await this.client.query('hbac:getUserAttributes', { userId });
      return result || {};
    } catch (error) {
      throw new Error(`Failed to get user attributes: ${error}`);
    }
  }

  /**
   * Assigns a role to a user
   * @param userId The user ID
   * @param roleId The role ID
   */
  async assignRole(userId: string, roleId: RoleId): Promise<void> {
    this.checkInitialized();
    
    try {
      await this.client.mutation('hbac:assignRole', { userId, roleId });
    } catch (error) {
      throw new Error(`Failed to assign role: ${error}`);
    }
  }

  /**
   * Removes a role from a user
   * @param userId The user ID
   * @param roleId The role ID
   */
  async removeRole(userId: string, roleId: RoleId): Promise<void> {
    this.checkInitialized();
    
    try {
      await this.client.mutation('hbac:removeRole', { userId, roleId });
    } catch (error) {
      throw new Error(`Failed to remove role: ${error}`);
    }
  }

  /**
   * Sets an attribute for a user
   * @param userId The user ID
   * @param attributeId The attribute ID
   * @param value The attribute value
   */
  async setAttribute(userId: string, attributeId: AttributeId, value: AttributeValue): Promise<void> {
    this.checkInitialized();
    
    try {
      await this.client.mutation('hbac:setAttribute', { userId, attributeId, value });
    } catch (error) {
      throw new Error(`Failed to set attribute: ${error}`);
    }
  }

  /**
   * Gets the complete access map for a user
   * @param userId The user ID
   * @returns The user access map or null if not found
   */
  async getUserAccessMap(userId: string): Promise<UserAccessMap | null> {
    this.checkInitialized();
    
    try {
      const result = await this.client.query('hbac:getUserAccessMap', { userId });
      return result || null;
    } catch (error) {
      throw new Error(`Failed to get user access map: ${error}`);
    }
  }

  /**
   * Checks if the connector is initialized
   * @throws Error if not initialized
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('Database connector not initialized');
    }
  }
}
```

### 4. Cache Manager

#### src/cache/manager.ts

```typescript
import { CacheConfig } from '../interfaces/config';
import { RoleId } from '../types/role';
import { AttributeValues } from '../types/attribute';

/**
 * Manages in-memory caching for HBAC
 */
export class CacheManager {
  private enabled: boolean;
  private ttl: number; // seconds
  private cache: Map<string, { value: any; expires: number }> = new Map();

  /**
   * Creates a new CacheManager
   * @param config Cache configuration
   */
  constructor(config: CacheConfig) {
    this.enabled = config.enabled;
    this.ttl = config.ttl;
  }

  /**
   * Gets a value from the cache
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  public get<T>(key: string): T | null {
    if (!this.enabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  /**
   * Sets a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param customTtl Optional custom TTL in seconds
   */
  public set<T>(key: string, value: T, customTtl?: number): void {
    if (!this.enabled) return;

    const ttl = customTtl || this.ttl;
    const expires = Date.now() + ttl * 1000;

    this.cache.set(key, { value, expires });
  }

  /**
   * Removes a value from the cache
   * @param key Cache key
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears all cached values
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cached user roles
   * @param userId User ID
   * @returns Cached roles or null if not found
   */
  public getUserRoles(userId: string): RoleId[] | null {
    return this.get<RoleId[]>(`roles:${userId}`);
  }

  /**
   * Sets cached user roles
   * @param userId User ID
   * @param roles Roles to cache
   */
  public setUserRoles(userId: string, roles: RoleId[]): void {
    this.set(`roles:${userId}`, roles);
  }

  /**
   * Gets cached user attributes
   * @param userId User ID
   * @returns Cached attributes or null if not found
   */
  public getUserAttributes(userId: string): AttributeValues | null {
    return this.get<AttributeValues>(`attributes:${userId}`);
  }

  /**
   * Sets cached user attributes
   * @param userId User ID
   * @param attributes Attributes to cache
   */
  public setUserAttributes(userId: string, attributes: AttributeValues): void {
    this.set(`attributes:${userId}`, attributes);
  }

  /**
   * Gets cached permission decision
   * @param key Decision cache key
   * @returns Cached decision or null if not found
   */
  public getPermissionDecision(key: string): boolean | null {
    return this.get<boolean>(`decision:${key}`);
  }

  /**
   * Sets cached permission decision
   * @param key Decision cache key
   * @param allowed Whether the permission is allowed
   */
  public setPermissionDecision(key: string, allowed: boolean): void {
    this.set(`decision:${key}`, allowed);
  }

  /**
   * Invalidates all cached data for a user
   * @param userId User ID
   */
  public invalidateUser(userId: string): void {
    this.delete(`roles:${userId}`);
    this.delete(`attributes:${userId}`);
    
    // Also clear any permission decisions for this user
    // This is a simple approach - in a more sophisticated implementation,
    // we might want to be more selective about which decisions to invalidate
    for (const key of this.cache.keys()) {
      if (key.startsWith(`decision:${userId}:`)) {
        this.delete(key);
      }
    }
  }
}
```

### 5. Role Manager

#### src/role/manager.ts

```typescript
import { RoleMap, RoleId, Permission } from '../types';

/**
 * Manages roles and permissions
 */
export class RoleManager {
  private roles: RoleMap;

  /**
   * Creates a new RoleManager
   * @param roles Role map from configuration
   */
  constructor(roles: RoleMap) {
    this.roles = roles;
  }

  /**
   * Gets all roles
   * @returns The role map
   */
  public getRoles(): RoleMap {
    return this.roles;
  }

  /**
   * Gets a role by ID
   * @param roleId Role ID
   * @returns The role or undefined if not found
   */
  public getRole(roleId: RoleId): RoleMap[string] | undefined {
    // Find the role with the matching ID
    for (const role of Object.values(this.roles)) {
      if (role.id === roleId) {
        return role;
      }
    }
    return undefined;
  }

  /**
   * Gets all permissions for a set of roles
   * @param roleIds Role IDs
   * @returns Set of permissions
   */
  public getPermissionsForRoles(roleIds: RoleId[]): Set<Permission> {
    const permissions = new Set<Permission>();
    
    for (const roleId of roleIds) {
      const role = this.getRole(roleId);
      if (role) {
        for (const permission of role.permissions) {
          permissions.add(permission);
        }
      }
    }
    
    return permissions;
  }

  /**
   * Checks if a set of roles has a specific permission
   * @param roleIds Role IDs
   * @param resource Resource to check
   * @param action Action to check
   * @returns Whether the roles have the permission
   */
  public hasPermission(roleIds: RoleId[], resource: string, action: string): boolean {
    // Special case: check for wildcard permissions
    if (this.hasWildcardPermission(roleIds)) {
      return true;
    }
    
    const permissions = this.getPermissionsForRoles(roleIds);
    
    // Check exact permission
    const exactPermission: Permission = `${resource}:${action}`;
    if (permissions.has(exactPermission)) {
      return true;
    }
    
    // Check resource wildcard
    const resourceWildcard: Permission = `${resource}:*`;
    if (permissions.has(resourceWildcard)) {
      return true;
    }
    
    // Check action wildcard
    const actionWildcard: Permission = `*:${action}`;
    if (permissions.has(actionWildcard)) {
      return true;
    }
    
    // Check ownership-specific permission
    const ownPermission: Permission = `${resource}:${action}:own`;
    if (permissions.has(ownPermission)) {
      // This is a partial match - full evaluation will need context
      // to determine if the user is the owner
      return true;
    }
    
    return false;
  }

  /**
   * Checks if a set of roles has the wildcard permission
   * @param roleIds Role IDs
   * @returns Whether the roles have the wildcard permission
   */
  private hasWildcardPermission(roleIds: RoleId[]): boolean {
    for (const roleId of roleIds) {
      const role = this.getRole(roleId);
      if (role && role.permissions.includes('*:*')) {
        return true;
      }
    }
    return false;
  }
}
```

### 6. Attribute Manager

#### src/attribute/manager.ts

```typescript
import { AttributeMap, AttributeId, AttributeValue, AttributeValues } from '../types';

/**
 * Manages attributes and evaluates attribute conditions
 */
export class AttributeManager {
  private attributes: AttributeMap;

  /**
   * Creates a new AttributeManager
   * @param attributes Attribute map from configuration
   */
  constructor(attributes: AttributeMap) {
    this.attributes = attributes;
  }

  /**
   * Gets all attributes
   * @returns The attribute map
   */
  public getAttributes(): AttributeMap {
    return this.attributes;
  }

  /**
   * Gets an attribute by ID
   * @param attributeId Attribute ID
   * @returns The attribute or undefined if not found
   */
  public getAttribute(attributeId: AttributeId): AttributeMap[string] | undefined {
    // Find the attribute with the matching ID
    for (const attribute of Object.values(this.attributes)) {
      if (attribute.id === attributeId) {
        return attribute;
      }
    }
    return undefined;
  }

  /**
   * Validates an attribute value against its type
   * @param attributeId Attribute ID
   * @param value Value to validate
   * @returns Whether the value is valid for the attribute
   */
  public validateAttributeValue(attributeId: AttributeId, value: AttributeValue): boolean {
    const attribute = this.getAttribute(attributeId);
    if (!attribute) {
      return false;
    }
    
    // Check type
    switch (attribute.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * Evaluates a condition against user attributes and context
   * @param condition Condition to evaluate
   * @param userAttributes User attributes
   * @param context Optional context data
   * @returns Whether the condition is satisfied
   */
  public evaluateCondition(
    condition: Record<string, any>,
    userAttributes: AttributeValues,
    context: Record<string, any> = {}
  ): boolean {
    // Evaluate each condition clause
    for (const [path, predicate] of Object.entries(condition)) {
      const value = this.resolvePath(path, userAttributes, context);
      
      // If value not found and not using a negation operator, condition fails
      if (value === undefined && typeof predicate === 'object' && !predicate.$ne) {
        return false;
      }
      
      // Evaluate the predicate
      if (!this.evaluatePredicate(value, predicate)) {
        return false;
      }
    }
    
    // All conditions passed
    return true;
  }

  /**
   * Resolves a path to a value from user attributes or context
   * @param path Path to resolve (e.g. 'attributes.clearanceLevel' or 'context.postId')
   * @param userAttributes User attributes
   * @param context Optional context data
   * @returns The resolved value or undefined if not found
   */
  private resolvePath(
    path: string,
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): any {
    // Handle special variable syntax (e.g. '$user.attributes.region')
    if (path.startsWith('$user.attributes.')) {
      const attributeName = path.substring('$user.attributes.'.length);
      return userAttributes[attributeName];
    }
    
    // Handle context reference
    if (path.startsWith('context.')) {
      const contextPath = path.substring('context.'.length);
      return this.getNestedValue(context, contextPath);
    }
    
    // Handle attributes reference
    if (path.startsWith('attributes.')) {
      const attributeName = path.substring('attributes.'.length);
      return userAttributes[attributeName];
    }
    
    // Direct attribute reference
    return userAttributes[path];
  }

  /**
   * Gets a nested value from an object
   * @param obj Object to get from
   * @param path Path to the value (e.g. 'user.profile.name')
   * @returns The value or undefined if not found
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Evaluates a predicate against a value
   * @param value Value to evaluate
   * @param predicate Predicate to use
   * @returns Whether the predicate is satisfied
   */
I'll continue with the implementation details for the HBAC package:

### 6. Attribute Manager (continued)

#### src/attribute/manager.ts (continued)

```typescript
  private evaluatePredicate(value: any, predicate: any): boolean {
    // Direct equality check
    if (typeof predicate !== 'object' || predicate === null) {
      return value === predicate;
    }
    
    // Operator-based predicates
    for (const [operator, operand] of Object.entries(predicate)) {
      switch (operator) {
        case '$eq':
          if (value !== operand) return false;
          break;
        case '$ne':
          if (value === operand) return false;
          break;
        case '$gt':
          if (typeof value !== 'number' || value <= operand) return false;
          break;
        case '$gte':
          if (typeof value !== 'number' || value < operand) return false;
          break;
        case '$lt':
          if (typeof value !== 'number' || value >= operand) return false;
          break;
        case '$lte':
          if (typeof value !== 'number' || value > operand) return false;
          break;
        case '$in':
          if (!Array.isArray(operand) || !operand.includes(value)) return false;
          break;
        case '$nin':
          if (!Array.isArray(operand) || operand.includes(value)) return false;
          break;
        case '$exists':
          if (operand ? value === undefined : value !== undefined) return false;
          break;
        default:
          // Unknown operator
          return false;
      }
    }
    
    return true;
  }
}
```

### 7. Policy Engine

#### src/policy/engine.ts

```typescript
import { PolicyRule, PolicyEffect, PolicyEvaluationType } from '../types';
import { RoleManager } from '../role/manager';
import { AttributeManager } from '../attribute/manager';
import { AttributeValues } from '../types/attribute';

/**
 * Policy engine for evaluating access decisions
 */
export class PolicyEngine {
  private policyRules: PolicyRule[];
  private defaultEffect: PolicyEffect;
  private evaluationType: PolicyEvaluationType;
  private roleManager: RoleManager;
  private attributeManager: AttributeManager;

  /**
   * Creates a new PolicyEngine
   * @param policyRules Policy rules from configuration
   * @param defaultEffect Default effect to use when no policy matches
   * @param evaluationType Evaluation type to use
   * @param roleManager Role manager
   * @param attributeManager Attribute manager
   */
  constructor(
    policyRules: PolicyRule[],
    defaultEffect: PolicyEffect,
    evaluationType: PolicyEvaluationType,
    roleManager: RoleManager,
    attributeManager: AttributeManager
  ) {
    this.policyRules = policyRules;
    this.defaultEffect = defaultEffect;
    this.evaluationType = evaluationType;
    this.roleManager = roleManager;
    this.attributeManager = attributeManager;
  }

  /**
   * Evaluates whether a user has permission to perform an action on a resource
   * @param userRoleIds User role IDs
   * @param userAttributes User attributes
   * @param resource Resource to check
   * @param action Action to check
   * @param context Optional context data
   * @returns Whether the action is allowed
   */
  public evaluate(
    userRoleIds: string[],
    userAttributes: AttributeValues,
    resource: string,
    action: string,
    context: Record<string, any> = {}
  ): boolean {
    // First, check role-based permissions
    const hasRolePermission = this.roleManager.hasPermission(userRoleIds, resource, action);
    
    // If the user has no role-based permission, deny access
    if (!hasRolePermission) {
      return false;
    }
    
    // Next, check policy rules for attribute-based evaluation
    // Filter relevant policy rules
    const relevantRules = this.policyRules.filter(rule => 
      (rule.resource === resource || rule.resource === '*') &&
      (rule.action === action || rule.action === '*')
    );
    
    // If no relevant rules, use role-based decision
    if (relevantRules.length === 0) {
      return true;  // Role-based permission already granted
    }
    
    return this.evaluatePolicyRules(relevantRules, userAttributes, context);
  }

  /**
   * Evaluates policy rules based on the configured evaluation type
   * @param rules Policy rules to evaluate
   * @param userAttributes User attributes
   * @param context Optional context data
   * @returns Whether the action is allowed
   */
  private evaluatePolicyRules(
    rules: PolicyRule[],
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): boolean {
    switch (this.evaluationType) {
      case 'firstApplicable':
        return this.evaluateFirstApplicable(rules, userAttributes, context);
      case 'allApplicable':
        return this.evaluateAllApplicable(rules, userAttributes, context);
      case 'denyOverrides':
        return this.evaluateDenyOverrides(rules, userAttributes, context);
      default:
        return this.defaultEffect === 'allow';
    }
  }

  /**
   * Evaluates policy rules using the first applicable rule
   * @param rules Policy rules to evaluate
   * @param userAttributes User attributes
   * @param context Optional context data
   * @returns Whether the action is allowed
   */
  private evaluateFirstApplicable(
    rules: PolicyRule[],
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): boolean {
    for (const rule of rules) {
      // Check if rule condition matches
      if (this.attributeManager.evaluateCondition(rule.condition, userAttributes, context)) {
        return rule.effect === 'allow';
      }
    }
    
    // No rule matched, use default effect
    return this.defaultEffect === 'allow';
  }

  /**
   * Evaluates policy rules using all applicable rules
   * @param rules Policy rules to evaluate
   * @param userAttributes User attributes
   * @param context Optional context data
   * @returns Whether the action is allowed
   */
  private evaluateAllApplicable(
    rules: PolicyRule[],
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): boolean {
    let anyMatched = false;
    let anyDenied = false;
    let anyAllowed = false;
    
    for (const rule of rules) {
      // Check if rule condition matches
      if (this.attributeManager.evaluateCondition(rule.condition, userAttributes, context)) {
        anyMatched = true;
        
        if (rule.effect === 'allow') {
          anyAllowed = true;
        } else {
          anyDenied = true;
        }
      }
    }
    
    // If any rule matched
    if (anyMatched) {
      // Both allow and deny rules matched
      if (anyAllowed && anyDenied) {
        // This is a conflict, deny by default
        return false;
      }
      
      // Only allow rules matched
      if (anyAllowed) {
        return true;
      }
      
      // Only deny rules matched
      return false;
    }
    
    // No rule matched, use default effect
    return this.defaultEffect === 'allow';
  }

  /**
   * Evaluates policy rules with deny overriding allow
   * @param rules Policy rules to evaluate
   * @param userAttributes User attributes
   * @param context Optional context data
   * @returns Whether the action is allowed
   */
  private evaluateDenyOverrides(
    rules: PolicyRule[],
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): boolean {
    let anyMatched = false;
    let anyAllowed = false;
    
    for (const rule of rules) {
      // Check if rule condition matches
      if (this.attributeManager.evaluateCondition(rule.condition, userAttributes, context)) {
        anyMatched = true;
        
        // Deny rule takes precedence
        if (rule.effect === 'deny') {
          return false;
        }
        
        if (rule.effect === 'allow') {
          anyAllowed = true;
        }
      }
    }
    
    // If any rule matched and none denied
    if (anyMatched && anyAllowed) {
      return true;
    }
    
    // No rule matched or none allowed, use default effect
    return this.defaultEffect === 'allow';
  }
}
```

### 8. Main HBAC Class

#### src/HBAC.ts

```typescript
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
 * Main HBAC class
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
   * @param configPath Path to the HBAC configuration file
   */
  constructor(private configPath: string) {
    this.configManager = new ConfigManager(configPath);
  }

  /**
   * Initializes HBAC
   * @param options Optional initialization options
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
      throw new Error(`Failed to initialize HBAC: ${error}`);
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
```

### 9. Express Middleware

#### src/middleware/express.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { HBAC } from '../HBAC';

interface ProtectOptions {
  getContext?: (req: Request) => Record<string, any>;
  getUserId?: (req: Request) => string;
}

/**
 * Creates Express middleware to protect routes
 * @param hbac HBAC instance
 * @param action Action to check
 * @param resource Resource to check
 * @param options Optional middleware options
 * @returns Express middleware function
 */
export function protect(
  hbac: HBAC,
  action: string,
  resource: string,
  options: ProtectOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from request
      const userId = options.getUserId 
        ? options.getUserId(req)
        : req.user?.id || req.user?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Get context from request
      const context = options.getContext ? options.getContext(req) : {};
      
      // Check permission
      const allowed = await hbac.can(userId, action, resource, context);
      
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  };
}
```

### 10. React Hooks

#### src/react/index.ts

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * HBAC client for browser use
 */
export class HBACClient {
  private apiUrl: string;

  /**
   * Creates a new HBACClient
   * @param apiUrl URL of the HBAC API
   */
  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  /**
   * Checks if a user has permission to perform an action on a resource
   * @param userId User ID
   * @param action Action to check
   * @param resource Resource to check
   * @param context Optional context data
   * @returns Whether the action is allowed
   */
  public async can(
    userId: string,
    action: string,
    resource: string,
    context: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/can`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action,
          resource,
          context
        }),
      });
      
      const data = await response.json();
      return data.allowed;
    } catch (error) {
      console.error('HBAC check failed:', error);
      return false;
    }
  }

  /**
   * Gets the roles for a user
   * @param userId User ID
   * @returns Array of role IDs
   */
  public async getUserRoles(userId: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiUrl}/roles/${userId}`);
      const data = await response.json();
      return data.roles;
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return [];
    }
  }

  /**
   * Gets the attributes for a user
   * @param userId User ID
   * @returns Map of attribute IDs to values
   */
  public async getUserAttributes(userId: string): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.apiUrl}/attributes/${userId}`);
      const data = await response.json();
      return data.attributes;
    } catch (error) {
      console.error('Failed to get user attributes:', error);
      return {};
    }
  }
}

interface HBACContextType {
  client: HBACClient | null;
  userId: string | null;
  can: (action: string, resource: string, context?: any) => Promise<boolean>;
  roles: string[];
  attributes: Record<string, any>;
  loading: boolean;
}

/**
 * HBAC React context
 */
const HBACContext = createContext<HBACContextType>({
  client: null,
  userId: null,
  can: async () => false,
  roles: [],
  attributes: {},
  loading: true
});

interface HBACProviderProps {
  children: ReactNode;
  client: HBACClient;
  userId: string | null;
}

/**
 * HBAC provider component
 */
export function HBACProvider({ children, client, userId }: HBACProviderProps) {
  const [roles, setRoles] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadUserData() {
      if (!userId) {
        setRoles([]);
        setAttributes({});
        setLoading(false);
        return;
      }
      
      try {
        const [userRoles, userAttributes] = await Promise.all([
          client.getUserRoles(userId),
          client.getUserAttributes(userId)
        ]);
        
        setRoles(userRoles);
        setAttributes(userAttributes);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    setLoading(true);
    loadUserData();
  }, [client, userId]);
  
  const can = async (action: string, resource: string, context?: any) => {
    if (!userId) return false;
    return client.can(userId, action, resource, context);
  };
  
  return (
    <HBACContext.Provider value={{ client, userId, can, roles, attributes, loading }}>
      {children}
    </HBACContext.Provider>
  );
}

/**
 * Hook to use HBAC in components
 */
export function useHBAC() {
  const context = useContext(HBACContext);
  
  if (!context) {
    throw new Error('useHBAC must be used within an HBACProvider');
  }
  
  return context;
}

/**
 * Hook to check permissions
 */
export function usePermission(
  action: string,
  resource: string,
  context?: Record<string, any>
) {
  const { can, loading: hbacLoading } = useHBAC();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkPermission() {
      if (hbacLoading) return;
      
      try {
        const result = await can(action, resource, context);
        setAllowed(result);
      } catch (error) {
        console.error('Permission check failed:', error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }
    
    setLoading(true);
    checkPermission();
  }, [can, action, resource, context, hbacLoading]);
  
  return { allowed, loading: loading || hbacLoading };
}
```

### 11. Main Entry Point

#### src/index.ts

```typescript
// Export HBAC class
export { HBAC } from './HBAC';

// Export middleware
export { protect } from './middleware/express';

// Export React hooks
export { HBACClient, HBACProvider, useHBAC, usePermission } from './react';

// Export types
export * from './types';
export * from './interfaces/config';
export * from './interfaces/database';
```

## Example Implementations

### 1. Express Server Example

#### examples/express/server.ts

```typescript
import express from 'express';
import { HBAC, protect } from 'hbac';
import jwt from 'jsonwebtoken';

// Initialize Express
const app = express();
app.use(express.json());

// Initialize HBAC
const hbac = new HBAC('./hbac.config.json');
(async () => {
  await hbac.initialize();
  console.log('HBAC initialized');
})();

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// API routes
app.get('/api/posts', authenticate, async (req, res) => {
  try {
    // Check if user has permission to list posts
    const hasAccess = await hbac.can(req.user.id, 'list', 'posts');
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Fetch posts from database
    const posts = await fetchPosts();
    
    return res.json({ posts });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Using the protect middleware
app.get('/api/posts/:id', authenticate, protect(hbac, 'read', 'posts', {
  getContext: (req) => ({ postId: req.params.id })
}), async (req, res) => {
  try {
    // Access granted, fetch the post
    const post = await fetchPost(req.params.id);
    
    return res.json({ post });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Mock function to fetch posts
async function fetchPosts() {
  return [
    { id: '1', title: 'Post 1', content: 'Content 1' },
    { id: '2', title: 'Post 2', content: 'Content 2' }
  ];
}

// Mock function to fetch a post
async function fetchPost(id) {
  return { id, title: `Post ${id}`, content: `Content ${id}` };
}
```

### 2. Next.js API Route Example

#### examples/nextjs/pages/api/posts/[id].ts

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { HBAC } from 'hbac';
import { getSession } from 'next-auth/react';

// Initialize HBAC
let hbac: HBAC | null = null;

// Get or initialize HBAC
async function getHBAC() {
  if (!hbac) {
    hbac = new HBAC('./hbac.config.json');
    await hbac.initialize();
  }
  return hbac;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const { id } = req.query;
  const userId = session.user.id;
  
  // Get HBAC instance
  const hbac = await getHBAC();
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      try {
        // Check permission
        const hasAccess = await hbac.can(userId, 'read', 'posts', { postId: id });
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // Fetch post logic
        const post = await fetchPostFromDatabase(id);
        return res.status(200).json(post);
      } catch (error) {
        return res.status(500).json({ message: 'Server error' });
      }
      
    case 'PUT':
      try {
        const post = await fetchPostFromDatabase(id);
        
        // Check permission with ownership context
        await hbac.check(userId, 'update', 'posts', { 
          postId: id,
          isOwner: post.authorId === userId
        });
        
        // Update post logic
        const updatedPost = await updatePostInDatabase(id, req.body);
        return res.status(200).json(updatedPost);
      } catch (error) {
        if (error.message === 'Access denied') {
          return res.status(403).json({ message: 'Access denied' });
        }
        return res.status(500).json({ message: 'Server error' });
      }
      
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

// Mock function to fetch a post
async function fetchPostFromDatabase(id) {
  return { id, title: `Post ${id}`, content: `Content ${id}`, authorId: 'user1' };
}

// Mock function to update a post
async function updatePostInDatabase(id, data) {
  return { id, ...data, authorId: 'user1' };
}
```

### 3. React Component Example (continued)

#### examples/react/AdminPage.tsx (continued)

```tsx
import { useEffect, useState } from 'react';
import { useHBAC } from 'hbac';
import { Navigate } from 'react-router-dom';

function AdminPage() {
  const { can, loading } = useHBAC();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  useEffect(() => {
    async function checkAccess() {
      const allowed = await can('access', 'admin-panel');
      setHasAccess(allowed);
    }
    
    if (!loading) {
      checkAccess();
    }
  }, [can, loading]);
  
  if (loading || hasAccess === null) {
    return <div>Loading...</div>;
  }
  
  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }
  
  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin content */}
    </div>
  );
}

export default AdminPage;
```

#### examples/react/usePermission.tsx

```tsx
import { usePermission } from 'hbac';

function DeleteButton({ postId, authorId }) {
  const { allowed, loading } = usePermission('delete', 'posts', { 
    postId, 
    authorId,
    isOwner: getCurrentUserId() === authorId 
  });
  
  if (loading) {
    return <button disabled>Loading...</button>;
  }
  
  if (!allowed) {
    return null;
  }
  
  return (
    <button onClick={handleDelete}>Delete Post</button>
  );
}

// Mock function to get current user ID
function getCurrentUserId() {
  return 'user1';
}

// Mock function to handle delete
function handleDelete() {
  console.log('Deleting post...');
}

export default DeleteButton;
```

### 4. Convex Integration Example

#### examples/convex/schema.ts

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  user_access_map: defineTable({
    userId: v.string(),
    roleIds: v.array(v.string()),
    attributes: v.object(v.any())
  })
});
```

#### examples/convex/hbac.ts

```typescript
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getUserRoles = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    return record?.roleIds || [];
  },
});

export const getUserAttributes = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    return record?.attributes || {};
  },
});

export const getUserAccessMap = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!record) return null;
    
    return {
      id: record._id.toString(),
      userId: record.userId,
      roleIds: record.roleIds,
      attributes: record.attributes
    };
  },
});

export const assignRole = mutation({
  args: { userId: v.string(), roleId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (record) {
      // Add role if not already assigned
      if (!record.roleIds.includes(args.roleId)) {
        await ctx.db.patch(record._id, {
          roleIds: [...record.roleIds, args.roleId]
        });
      }
    } else {
      // Create new record
      await ctx.db.insert("user_access_map", {
        userId: args.userId,
        roleIds: [args.roleId],
        attributes: {}
      });
    }
  },
});

export const removeRole = mutation({
  args: { userId: v.string(), roleId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (record) {
      // Remove role if assigned
      const roleIndex = record.roleIds.indexOf(args.roleId);
      if (roleIndex !== -1) {
        const roleIds = [...record.roleIds];
        roleIds.splice(roleIndex, 1);
        
        await ctx.db.patch(record._id, { roleIds });
      }
    }
  },
});

export const setAttribute = mutation({
  args: { 
    userId: v.string(), 
    attributeId: v.string(), 
    value: v.any() 
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (record) {
      // Update attribute
      const attributes = { ...record.attributes };
      attributes[args.attributeId] = args.value;
      
      await ctx.db.patch(record._id, { attributes });
    } else {
      // Create new record
      const attributes = {};
      attributes[args.attributeId] = args.value;
      
      await ctx.db.insert("user_access_map", {
        userId: args.userId,
        roleIds: [],
        attributes
      });
    }
  },
});
```

#### examples/convex/posts.ts

```typescript
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { HBAC } from 'hbac';

// Initialize HBAC
let hbac: HBAC | null = null;

async function getHBAC() {
  if (!hbac) {
    hbac = new HBAC('./hbac.config.json');
    await hbac.initialize();
  }
  return hbac;
}

// Get all posts with permission check
export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) throw new Error('Unauthorized');
    
    const userId = auth.subject;
    const hbac = await getHBAC();
    
    // Check if user has permission to list posts
    const hasAccess = await hbac.can(userId, 'list', 'posts');
    if (!hasAccess) throw new Error('Access denied');
    
    // Return all posts
    return ctx.db.query('posts').collect();
  },
});

// Get a single post with permission check
export const get = query({
  args: { id: v.id('posts') },
  handler: async (ctx, args) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) throw new Error('Unauthorized');
    
    const userId = auth.subject;
    const hbac = await getHBAC();
    
    // Get the post
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error('Post not found');
    
    // Check if user has permission to read this post
    const hasAccess = await hbac.can(userId, 'read', 'posts', {
      postId: args.id,
      isOwner: post.authorId === userId
    });
    
    if (!hasAccess) throw new Error('Access denied');
    
    return post;
  },
});

// Create a new post with permission check
export const create = mutation({
  args: { 
    title: v.string(),
    content: v.string()
  },
  handler: async (ctx, args) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) throw new Error('Unauthorized');
    
    const userId = auth.subject;
    const hbac = await getHBAC();
    
    // Check if user has permission to create posts
    const hasAccess = await hbac.can(userId, 'create', 'posts');
    if (!hasAccess) throw new Error('Access denied');
    
    // Create the post
    return ctx.db.insert('posts', {
      title: args.title,
      content: args.content,
      authorId: userId,
      createdAt: Date.now()
    });
  },
});
```

## Unit Tests

### tests/roleManager.test.ts

```typescript
import { RoleManager } from '../src/role/manager';

describe('RoleManager', () => {
  const roles = {
    admin: {
      id: 'role_admin',
      description: 'Administrator',
      permissions: ['*:*']
    },
    editor: {
      id: 'role_editor',
      description: 'Content Editor',
      permissions: ['posts:read', 'posts:write', 'comments:moderate']
    },
    user: {
      id: 'role_user',
      description: 'Regular User',
      permissions: ['posts:read', 'comments:write']
    }
  };

  const roleManager = new RoleManager(roles);

  test('getRole should return the correct role', () => {
    const adminRole = roleManager.getRole('role_admin');
    expect(adminRole).toEqual(roles.admin);

    const editorRole = roleManager.getRole('role_editor');
    expect(editorRole).toEqual(roles.editor);

    const nonExistentRole = roleManager.getRole('non_existent');
    expect(nonExistentRole).toBeUndefined();
  });

  test('hasPermission should correctly check permissions', () => {
    // Admin has wildcard permission
    expect(roleManager.hasPermission(['role_admin'], 'posts', 'read')).toBe(true);
    expect(roleManager.hasPermission(['role_admin'], 'users', 'delete')).toBe(true);

    // Editor has specific permissions
    expect(roleManager.hasPermission(['role_editor'], 'posts', 'read')).toBe(true);
    expect(roleManager.hasPermission(['role_editor'], 'posts', 'write')).toBe(true);
    expect(roleManager.hasPermission(['role_editor'], 'comments', 'moderate')).toBe(true);
    expect(roleManager.hasPermission(['role_editor'], 'users', 'delete')).toBe(false);

    // User has limited permissions
    expect(roleManager.hasPermission(['role_user'], 'posts', 'read')).toBe(true);
    expect(roleManager.hasPermission(['role_user'], 'comments', 'write')).toBe(true);
    expect(roleManager.hasPermission(['role_user'], 'posts', 'write')).toBe(false);

    // Multiple roles combine permissions
    expect(roleManager.hasPermission(['role_user', 'role_editor'], 'posts', 'write')).toBe(true);
    expect(roleManager.hasPermission(['role_user', 'role_editor'], 'users', 'delete')).toBe(false);
  });
});
```

### tests/attributeManager.test.ts

```typescript
import { AttributeManager } from '../src/attribute/manager';

describe('AttributeManager', () => {
  const attributes = {
    department: {
      id: 'attr_department',
      type: 'string',
      description: "User's department"
    },
    clearanceLevel: {
      id: 'attr_clearance',
      type: 'number',
      description: 'Security clearance level'
    },
    isVerified: {
      id: 'attr_verified',
      type: 'boolean',
      description: 'Whether user is verified'
    }
  };

  const attributeManager = new AttributeManager(attributes);

  test('getAttribute should return the correct attribute', () => {
    const deptAttr = attributeManager.getAttribute('attr_department');
    expect(deptAttr).toEqual(attributes.department);

    const clearanceAttr = attributeManager.getAttribute('attr_clearance');
    expect(clearanceAttr).toEqual(attributes.clearanceLevel);

    const nonExistentAttr = attributeManager.getAttribute('non_existent');
    expect(nonExistentAttr).toBeUndefined();
  });

  test('validateAttributeValue should validate values correctly', () => {
    // String validation
    expect(attributeManager.validateAttributeValue('attr_department', 'Engineering')).toBe(true);
    expect(attributeManager.validateAttributeValue('attr_department', 123)).toBe(false);
    
    // Number validation
    expect(attributeManager.validateAttributeValue('attr_clearance', 3)).toBe(true);
    expect(attributeManager.validateAttributeValue('attr_clearance', '3')).toBe(false);
    
    // Boolean validation
    expect(attributeManager.validateAttributeValue('attr_verified', true)).toBe(true);
    expect(attributeManager.validateAttributeValue('attr_verified', 'true')).toBe(false);
  });

  test('evaluateCondition should evaluate conditions correctly', () => {
    const userAttributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 3,
      'attr_verified': true
    };
    
    // Simple equality
    expect(attributeManager.evaluateCondition({
      'attributes.department': 'Engineering'
    }, userAttributes)).toBe(true);
    
    expect(attributeManager.evaluateCondition({
      'attributes.department': 'Marketing'
    }, userAttributes)).toBe(false);
    
    // Comparison operators
    expect(attributeManager.evaluateCondition({
      'attributes.clearanceLevel': { '$gte': 3 }
    }, userAttributes)).toBe(true);
    
    expect(attributeManager.evaluateCondition({
      'attributes.clearanceLevel': { '$gt': 3 }
    }, userAttributes)).toBe(false);
    
    // Boolean check
    expect(attributeManager.evaluateCondition({
      'attributes.isVerified': true
    }, userAttributes)).toBe(true);
    
    // Multiple conditions (AND)
    expect(attributeManager.evaluateCondition({
      'attributes.department': 'Engineering',
      'attributes.clearanceLevel': { '$gte': 2 },
      'attributes.isVerified': true
    }, userAttributes)).toBe(true);
    
    expect(attributeManager.evaluateCondition({
      'attributes.department': 'Engineering',
      'attributes.clearanceLevel': { '$gt': 3 },
      'attributes.isVerified': true
    }, userAttributes)).toBe(false);
    
    // With context
    const context = {
      postId: '123',
      authorId: 'user1'
    };
    
    expect(attributeManager.evaluateCondition({
      'context.postId': '123'
    }, userAttributes, context)).toBe(true);
    
    expect(attributeManager.evaluateCondition({
      'context.postId': '456'
    }, userAttributes, context)).toBe(false);
  });
});
```

### tests/policyEngine.test.ts

```typescript
import { PolicyEngine } from '../src/policy/engine';
import { RoleManager } from '../src/role/manager';
import { AttributeManager } from '../src/attribute/manager';

describe('PolicyEngine', () => {
  const roles = {
    admin: {
      id: 'role_admin',
      permissions: ['*:*']
    },
    editor: {
      id: 'role_editor',
      permissions: ['posts:read', 'posts:write', 'comments:moderate']
    },
    user: {
      id: 'role_user',
      permissions: ['posts:read', 'comments:write']
    }
  };

  const attributes = {
    department: {
      id: 'attr_department',
      type: 'string'
    },
    clearanceLevel: {
      id: 'attr_clearance',
      type: 'number'
    },
    isVerified: {
      id: 'attr_verified',
      type: 'boolean'
    }
  };

  const policyRules = [
    {
      id: 'policy_sensitive_docs',
      resource: 'documents',
      action: 'read',
      condition: {
        'attributes.clearanceLevel': { '$gte': 3 },
        'attributes.isVerified': true
      },
      effect: 'allow'
    },
    {
      id: 'policy_own_posts',
      resource: 'posts',
      action: 'update',
      condition: {
        'context.isOwner': true
      },
      effect: 'allow'
    }
  ];

  const roleManager = new RoleManager(roles);
  const attributeManager = new AttributeManager(attributes);
  
  test('firstApplicable evaluation should work correctly', () => {
    const policyEngine = new PolicyEngine(
      policyRules,
      'deny',
      'firstApplicable',
      roleManager,
      attributeManager
    );
    
    const userRoles = ['role_user'];
    const userAttributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 3,
      'attr_verified': true
    };
    
    // Role-based permission check
    expect(policyEngine.evaluate(userRoles, userAttributes, 'posts', 'read')).toBe(true);
    expect(policyEngine.evaluate(userRoles, userAttributes, 'posts', 'write')).toBe(false);
    
    // Attribute-based permission check
    expect(policyEngine.evaluate(userRoles, userAttributes, 'documents', 'read')).toBe(true);
    
    // With insufficient clearance
    const lowClearanceAttributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 2,
      'attr_verified': true
    };
    expect(policyEngine.evaluate(userRoles, lowClearanceAttributes, 'documents', 'read')).toBe(false);
    
    // Context-based permission check
    expect(policyEngine.evaluate(userRoles, userAttributes, 'posts', 'update', { isOwner: true })).toBe(true);
    expect(policyEngine.evaluate(userRoles, userAttributes, 'posts', 'update', { isOwner: false })).toBe(false);
  });
  
  test('denyOverrides evaluation should work correctly', () => {
    const conflictingRules = [
      ...policyRules,
      {
        id: 'policy_deny_engineering',
        resource: 'documents',
        action: 'read',
        condition: {
          'attributes.department': 'Engineering'
        },
        effect: 'deny'
      }
    ];
    
    const policyEngine = new PolicyEngine(
      conflictingRules,
      'allow',
      'denyOverrides',
      roleManager,
      attributeManager
    );
    
    const userRoles = ['role_user'];
    const userAttributes = {
      'attr_department': 'Engineering',
      'attr_clearance': 3,
      'attr_verified': true
    };
    
    // Deny overrides allow
    expect(policyEngine.evaluate(userRoles, userAttributes, 'documents', 'read')).toBe(false);
    
    // Different department would be allowed
    const marketingAttributes = {
      'attr_department': 'Marketing',
      'attr_clearance': 3,
      'attr_verified': true
    };
    expect(policyEngine.evaluate(userRoles, marketingAttributes, 'documents', 'read')).toBe(true);
  });
});
```

## Project Documentation

### README.md (Updated)

```markdown
# HBAC (Hybrid-Based Access Control)

HBAC is a Node.js package that implements a hybrid Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) system. It provides flexible, scalable, and easy-to-implement access control for applications ranging from small blogs to enterprise-level platforms.

## Features

- Hybrid RBAC/ABAC approach
- Simple configuration through JSON
- Convex database integration (default)
- Minimal database footprint
- Scalable from small to enterprise applications
- Performance-optimized access control decisions
- Easy integration with Express, Next.js, and React

## Installation

```bash
npm install hbac
```

## Quick Start

1. Create a configuration file (`hbac.config.json`):

```json
{
  "version": "1.0",
  "database": {
    "type": "convex",
    "tableName": "user_access_map"
  },
  "cache": {
    "enabled": true,
    "ttl": 300
  },
  "audit": {
    "enabled": true,
    "level": "info"
  },
  "policies": {
    "defaultEffect": "deny",
    "evaluation": "firstApplicable"
  },
  "roles": {
    "admin": {
      "id": "role_admin",
      "description": "Administrator",
      "permissions": ["*:*"]
    },
    "editor": {
      "id": "role_editor",
      "description": "Content Editor",
      "permissions": ["posts:read", "posts:write", "comments:moderate"]
    },
    "user": {
      "id": "role_user",
      "description": "Regular User",
      "permissions": ["posts:read", "comments:write"]
    }
  },
  "attributes": {
    "department": {
      "id": "attr_department",
      "type": "string",
      "description": "User's department"
    },
    "clearanceLevel": {
      "id": "attr_clearance",
      "type": "number",
      "description": "Security clearance level"
    },
    "isVerified": {
      "id": "attr_verified",
      "type": "boolean",
      "description": "Whether user is verified"
    }
  },
  "policyRules": [
    {
      "id": "policy_sensitive_docs",
      "name": "SensitiveDocAccess",
      "description": "Access to sensitive documents",
      "resource": "documents",
      "action": "read",
      "condition": {
        "attributes.clearanceLevel": { "$gte": 3 },
        "attributes.isVerified": true
      },
      "effect": "allow"
    }
  ]
}
```

2. Initialize HBAC in your application:

```typescript
import { HBAC } from 'hbac';

const hbac = new HBAC('./hbac.config.json');
await hbac.initialize();

// Now you can use HBAC for access control
const allowed = await hbac.can('user123', 'read', 'posts');
```

## Usage Examples

### Express.js Middleware

```typescript
import express from 'express';
import { HBAC, protect } from 'hbac';

const app = express();
const hbac = new HBAC('./hbac.config.json');
await hbac.initialize();

// Using the protect middleware
app.get('/posts/:id', protect(hbac, 'read', 'posts', {
  getContext: (req) => ({ postId: req.params.id })
}), (req, res) => {
  // Access granted, handle the request
});
```

### React Integration

```tsx
import { HBACProvider, HBACClient, useHBAC } from 'hbac';

// In your app component
function App() {
  const hbacClient = new HBACClient('/api/hbac');
  
  return (
    <HBACProvider client={hbacClient} userId={user?.id || null}>
      <YourApp />
    </HBACProvider>
  );
}

// In your components
function AdminPanel() {
  const { can } = useHBAC();
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    async function checkAccess() {
      const allowed = await can('access', 'admin-panel');
      setHasAccess(allowed);
    }
    
    checkAccess();
  }, [can]);
  
  if (!hasAccess) {
    return <AccessDenied />;
  }
  
  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin content */}
    </div>
  );
}
```

## API Reference

### HBAC Class

```typescript
class HBAC {
  constructor(configPath: string);
  initialize(options?: { convexClient?: ConvexClient }): Promise<void>;
  can(userId: string, action: string, resource: string, context?: object): Promise<boolean>;
  check(userId: string, action: string, resource: string, context?: object): Promise<void>;
  getUserRoles(userId: string): Promise<string[]>;
  getUserAttributes(userId: string): Promise<Record<string, any>>;
  assignRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  setAttribute(userId: string, attributeId: string, value: any): Promise<void>;
}
```

### Express Middleware

```typescript
function protect(
  hbac: HBAC,
  action: string,
  resource: string,
  options?: {
    getContext?: (req: Request) => Record<string, any>;
    getUserId?: (req: Request) => string;
  }
): (req: Request, res: Response, next: NextFunction) => Promise<void>;
```

### React Hooks

```typescript
function useHBAC(): {
  client: HBACClient | null;
  userId: string | null;
  can: (action: string, resource: string, context?: any) => Promise<boolean>;
  roles: string[];
  attributes: Record<string, any>;
  loading: boolean;
};

function usePermission(
  action: string,
  resource: string,
  context?: Record<string, any>
): {
  allowed: boolean;
  loading: boolean;
};
```

## License

MIT
```

## Deployment Plan

1. **Initial Setup**
   - Initialize Git repository
   - Set up NPM package
   - Configure TypeScript
   - Set up ESLint and Prettier

2. **Core Implementation**
   - Implement types and interfaces
   - Implement configuration manager
   - Implement database connectors
   - Implement role manager
   - Implement attribute manager
   - Implement policy engine
   - Implement cache manager
   - Implement main HBAC class

3. **Testing**
   - Implement unit tests for each component
   - Test integration between components

4. **Integrations**
   - Implement Express middleware
   - Implement React hooks
   - Implement Convex integrations

5. **Examples and Documentation**
   - Create example implementations
   - Write comprehensive documentation
   - Add code comments

6. **Packaging and Publishing**
   - Ensure all exports are correct
   - Build the package
   - Publish to NPM

This development plan provides a comprehensive roadmap for implementing the HBAC package based on the design document. The modular architecture allows for easy extension and maintenance, while the various integrations make it simple to use in different application contexts.