// file: src/role/manager.ts
// description: Manages roles and permissions for the access control system

import { RoleMap, RoleId, Permission } from '../types';

/**
 * Manages role-based access control logic
 * 
 * Responsible for handling role definitions, permissions, and permission checks
 */
export class RoleManager {
  /**
   * Creates a new RoleManager instance
   * 
   * @param roles Predefined role map from configuration
   */
  constructor(private roles: RoleMap) {}

  /**
   * Retrieves all defined roles
   * 
   * @returns Complete map of roles
   */
  public getRoles(): RoleMap {
    return this.roles;
  }

  /**
   * Finds a specific role by its unique identifier
   * 
   * @param roleId Unique identifier of the role
   * @returns The role definition or undefined if not found
   */
  public getRole(roleId: RoleId): RoleMap[string] | undefined {
    return Object.values(this.roles).find(role => role.id === roleId);
  }

  /**
   * Aggregates all permissions for a given set of roles
   * 
   * @param roleIds Array of role identifiers
   * @returns Set of unique permissions across all specified roles
   */
  public getPermissionsForRoles(roleIds: RoleId[]): Set<Permission> {
    const permissions = new Set<Permission>();
    
    for (const roleId of roleIds) {
      const role = this.getRole(roleId);
      if (role) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    }
    
    return permissions;
  }

  /**
   * Checks if any of the specified roles have permission for a specific resource and action
   * 
   * @param roleIds Array of role identifiers to check
   * @param resource The resource being accessed
   * @param action The action being performed
   * @returns Boolean indicating if permission is granted
   */
  public hasPermission(roleIds: RoleId[], resource: string, action: string): boolean {
    // Special case: check for wildcard permissions
    if (this.hasWildcardPermission(roleIds)) {
      return true;
    }
    
    const permissions = this.getPermissionsForRoles(roleIds);
    
    // Permission check priorities
    const permissionChecks: Permission[] = [
      `${resource}:${action}`,       // Exact match
      `${resource}:*`,                // Resource wildcard
      `*:${action}`,                  // Action wildcard
      `${resource}:${action}:own`     // Ownership-specific permission
    ];
    
    return permissionChecks.some(permission => permissions.has(permission));
  }

  /**
   * Checks if any of the specified roles have a wildcard permission
   * 
   * @param roleIds Array of role identifiers
   * @returns Boolean indicating if a wildcard permission exists
   */
  private hasWildcardPermission(roleIds: RoleId[]): boolean {
    return roleIds.some(roleId => {
      const role = this.getRole(roleId);
      return role ? role.permissions.includes('*:*') : false;
    });
  }
}