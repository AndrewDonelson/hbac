import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Create a new role
export const createRole = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string())
  },
  handler: async (ctx, args) => {
    // Check if role already exists
    const existingRole = await ctx.db
      .query("roles")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (existingRole) {
      throw new Error(`Role with ID ${args.id} already exists`);
    }

    // Insert new role
    return await ctx.db.insert("roles", {
      id: args.id,
      name: args.name,
      description: args.description,
      permissions: args.permissions
    });
  },
});

// Update an existing role
export const updateRole = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const existingRole = await ctx.db
      .query("roles")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!existingRole) {
      throw new Error(`Role with ID ${args.id} not found`);
    }

    // Prepare update object with only provided fields
    const updateData: Record<string, any> = {};
    if (args.name) updateData.name = args.name;
    if (args.description) updateData.description = args.description;
    if (args.permissions) updateData.permissions = args.permissions;

    await ctx.db.patch(existingRole._id, updateData);
  },
});

// Delete a role
export const deleteRole = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existingRole = await ctx.db
      .query("roles")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!existingRole) {
      throw new Error(`Role with ID ${args.id} not found`);
    }

    // Remove the role
    await ctx.db.delete(existingRole._id);

    // Remove this role from all user access maps
    const userAccessMaps = await ctx.db
      .query("user_access_map")
      .collect();
    
    for (const userMap of userAccessMaps) {
      const updatedRoles = userMap.roleIds.filter(roleId => roleId !== args.id);
      
      if (updatedRoles.length !== userMap.roleIds.length) {
        await ctx.db.patch(userMap._id, { roleIds: updatedRoles });
      }
    }
  },
});

// Get all roles
export const getAllRoles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("roles").collect();
  },
});

// Get a specific role by ID
export const getRoleById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roles")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
  },
});