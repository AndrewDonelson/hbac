// file: tests/role/manager.test.ts
// description: Tests for the role manager component

import { RoleManager } from '../../src/role/manager';
import { RoleMap, Permission } from '../../src/types';

describe('RoleManager', () => {
  // Sample roles for testing
  const roles: RoleMap = {
    admin: {
      id: 'role_admin',
      description: 'Administrator',
      permissions: ['*:*'] as Permission[],
    },
    editor: {
      id: 'role_editor',
      description: 'Content Editor',
      permissions: ['posts:read', 'posts:write', 'comments:moderate'] as Permission[],
    },
    user: {
      id: 'role_user',
      description: 'Regular User',
      permissions: ['posts:read', 'comments:write'] as Permission[],
    },
  };

  test('should get all roles', () => {
    const roleManager = new RoleManager(roles);
    expect(roleManager.getRoles()).toEqual(roles);
  });

  test('should get role by ID', () => {
    const roleManager = new RoleManager(roles);
    expect(roleManager.getRole('role_admin')).toEqual(roles.admin);
    expect(roleManager.getRole('role_editor')).toEqual(roles.editor);
    expect(roleManager.getRole('role_user')).toEqual(roles.user);
    expect(roleManager.getRole('non_existent')).toBeUndefined();
  });

  test('should get permissions for roles', () => {
    const roleManager = new RoleManager(roles);
    
    // Single role
    const adminPermissions = roleManager.getPermissionsForRoles(['role_admin']);
    expect(adminPermissions.size).toBe(1);
    expect(adminPermissions.has('*:*')).toBe(true);
    
    // Multiple roles
    const editorAndUserPermissions = roleManager.getPermissionsForRoles(['role_editor', 'role_user']);
    expect(editorAndUserPermissions.size).toBe(4);
    expect(editorAndUserPermissions.has('posts:read')).toBe(true);
    expect(editorAndUserPermissions.has('posts:write')).toBe(true);
    expect(editorAndUserPermissions.has('comments:moderate')).toBe(true);
    expect(editorAndUserPermissions.has('comments:write')).toBe(true);
    
    // Empty roles
    const emptyPermissions = roleManager.getPermissionsForRoles([]);
    expect(emptyPermissions.size).toBe(0);
    
    // Non-existent roles
    const nonExistentPermissions = roleManager.getPermissionsForRoles(['non_existent']);
    expect(nonExistentPermissions.size).toBe(0);
  });

  test('should check permissions correctly', () => {
    const roleManager = new RoleManager(roles);
    
    // Admin has wildcard permission
    expect(roleManager.hasPermission(['role_admin'], 'anything', 'anything')).toBe(true);
    
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
    
    // Non-existent roles
    expect(roleManager.hasPermission(['non_existent'], 'posts', 'read')).toBe(false);
    
    // Empty roles array
    expect(roleManager.hasPermission([], 'posts', 'read')).toBe(false);
  });

  test('should handle ownership-specific permissions', () => {
    const rolesWithOwnership: RoleMap = {
      user: {
        id: 'role_user',
        description: 'Regular User',
        permissions: ['posts:read', 'posts:update:own'] as Permission[],
      },
    };
    
    const roleManager = new RoleManager(rolesWithOwnership);
    
    // User has permission to update their own posts
    expect(roleManager.hasPermission(['role_user'], 'posts', 'update')).toBe(true);
  });
});