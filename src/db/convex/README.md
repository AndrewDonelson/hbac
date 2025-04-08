# HBAC Convex Functions

## Overview

This directory contains Convex functions and schema for the Hybrid-Based Access Control (HBAC) system.

## Schema

The schema consists of three main tables:
- `user_access_map`: Stores user roles and attributes
- `roles`: Defines available roles and their permissions
- `attributes`: Defines available attribute types

## Function Categories

### User Access Map Functions (`hbac/userAccessMap.ts`)
- `getUserRoles`: Retrieve roles for a user
- `getUserAttributes`: Retrieve attributes for a user
- `getUserAccessMap`: Get complete user access information
- `assignRole`: Add a role to a user
- `removeRole`: Remove a role from a user
- `setAttribute`: Set a user attribute

### Role Management Functions (`hbac/roleManagement.ts`)
- `createRole`: Define a new role
- `updateRole`: Modify an existing role
- `deleteRole`: Remove a role
- `getAllRoles`: List all roles
- `getRoleById`: Get a specific role

### Attribute Management Functions (`hbac/attributeManagement.ts`)
- `createAttribute`: Define a new attribute type
- `updateAttribute`: Modify an existing attribute definition
- `deleteAttribute`: Remove an attribute type
- `getAllAttributes`: List all attribute definitions
- `getAttributeById`: Get a specific attribute
- `validateAttributeValue`: Check if a value matches an attribute's type

## Example Usage

### Creating a Role
```typescript
await ctx.db.mutation('hbac:createRole', {
  id: 'role_admin',
  name: 'Administrator',
  description: 'Full system access',
  permissions: ['*:*']
});
```

### Assigning a Role to a User
```typescript
await ctx.db.mutation('hbac:assignRole', {
  userId: 'user123',
  roleId: 'role_admin'
});
```

### Creating an Attribute
```typescript
await ctx.db.mutation('hbac:createAttribute', {
  id: 'attr_department',
  name: 'Department',
  type: 'string',
  description: 'User\'s organizational department'
});
```

### Setting a User Attribute
```typescript
await ctx.db.mutation('hbac:setAttribute', {
  userId: 'user123',
  attributeId: 'attr_department',
  value: 'Engineering'
});
```

## Validation

- Roles are created with unique IDs
- Attributes have predefined types: 'string', 'number', 'boolean', 'object', 'array'
- User attributes are validated against their defined type

## Best Practices

1. Always validate attributes before setting them
2. Use unique, descriptive IDs for roles and attributes
3. Be consistent with permission and attribute naming
4. Remove roles and attributes that are no longer used

## Troubleshooting

- Ensure unique IDs when creating roles or attributes
- Check attribute types when setting values
- Verify user IDs exist before assigning roles or attributes