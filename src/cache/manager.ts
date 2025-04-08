// file: src/cache/manager.ts
// description: Manages in-memory caching for HBAC to improve performance and reduce database load

import { CacheConfig } from '../interfaces/config';
import { RoleId } from '../types/role';
import { AttributeValues } from '../types/attribute';

/**
 * CacheManager provides an in-memory caching mechanism for HBAC
 * 
 * Handles caching of user roles, attributes, and access decisions
 * with configurable time-to-live (TTL) and cache invalidation
 */
export class CacheManager {
  /**
   * Internal cache storage using a Map
   * Stores cached items with their expiration timestamp
   */
  private cache: Map<string, { value: any; expires: number }> = new Map();

  /**
   * Creates a new CacheManager instance
   * 
   * @param config Cache configuration settings
   */
  constructor(
    private config: CacheConfig
  ) {}

  /**
   * Retrieves a cached value by key
   * 
   * @template T Type of the cached value
   * @param key Unique cache key
   * @returns Cached value or null if not found or expired
   */
  public get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    const cachedItem = this.cache.get(key);
    if (!cachedItem) return null;

    // Check if the cached item has expired
    if (Date.now() > cachedItem.expires) {
      this.cache.delete(key);
      return null;
    }

    return cachedItem.value as T;
  }

  /**
   * Stores a value in the cache
   * 
   * @template T Type of the value to cache
   * @param key Unique cache key
   * @param value Value to be cached
   * @param customTtl Optional custom time-to-live in seconds
   */
  public set<T>(key: string, value: T, customTtl?: number): void {
    if (!this.config.enabled) return;

    const ttl = customTtl ?? this.config.ttl;
    const expires = Date.now() + (ttl * 1000);

    this.cache.set(key, { value, expires });
  }

  /**
   * Removes a specific item from the cache
   * 
   * @param key Unique cache key to remove
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears all items from the cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Retrieves cached user roles
   * 
   * @param userId Unique user identifier
   * @returns Cached roles or null if not found
   */
  public getUserRoles(userId: string): RoleId[] | null {
    return this.get<RoleId[]>(`roles:${userId}`);
  }

  /**
   * Caches user roles
   * 
   * @param userId Unique user identifier
   * @param roles Array of role identifiers to cache
   */
  public setUserRoles(userId: string, roles: RoleId[]): void {
    this.set(`roles:${userId}`, roles);
  }

  /**
   * Retrieves cached user attributes
   * 
   * @param userId Unique user identifier
   * @returns Cached attributes or null if not found
   */
  public getUserAttributes(userId: string): AttributeValues | null {
    return this.get<AttributeValues>(`attributes:${userId}`);
  }

  /**
   * Caches user attributes
   * 
   * @param userId Unique user identifier
   * @param attributes User attribute values to cache
   */
  public setUserAttributes(userId: string, attributes: AttributeValues): void {
    this.set(`attributes:${userId}`, attributes);
  }

  /**
   * Retrieves a cached permission decision
   * 
   * @param key Unique decision cache key
   * @returns Cached decision or null if not found
   */
  public getPermissionDecision(key: string): boolean | null {
    return this.get<boolean>(`decision:${key}`);
  }

  /**
   * Caches a permission decision
   * 
   * @param key Unique decision cache key
   * @param allowed Whether the permission is allowed
   */
  public setPermissionDecision(key: string, allowed: boolean): void {
    this.set(`decision:${key}`, allowed);
  }

  /**
   * Invalidates all cached data for a specific user
   * 
   * @param userId Unique user identifier
   */
  public invalidateUser(userId: string): void {
    // Remove roles and attributes
    this.delete(`roles:${userId}`);
    this.delete(`attributes:${userId}`);
    
    // Remove all permission decisions for this user
    for (const key of this.cache.keys()) {
      if (key.startsWith(`decision:${userId}:`)) {
        this.delete(key);
      }
    }
  }
}