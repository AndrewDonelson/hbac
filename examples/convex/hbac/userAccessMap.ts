import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get user roles
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

// Get user attributes
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

// Get full user access map
export const getUserAccessMap = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    return record ? {
      userId: record.userId,
      roleIds: record.roleIds,
      attributes: record.attributes
    } : null;
  },
});

// Assign role to user
export const assignRole = mutation({
  args: { 
    userId: v.string(), 
    roleId: v.string() 
  },
  handler: async (ctx, args) => {
    const existingRecord = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (existingRecord) {
      // Add role if not already assigned
      if (!existingRecord.roleIds.includes(args.roleId)) {
        await ctx.db.patch(existingRecord._id, {
          roleIds: [...existingRecord.roleIds, args.roleId]
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

// Remove role from user
export const removeRole = mutation({
  args: { 
    userId: v.string(), 
    roleId: v.string() 
  },
  handler: async (ctx, args) => {
    const existingRecord = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (existingRecord) {
      // Remove role if exists
      const updatedRoles = existingRecord.roleIds.filter(
        roleId => roleId !== args.roleId
      );
      
      await ctx.db.patch(existingRecord._id, {
        roleIds: updatedRoles
      });
    }
  },
});

// Set user attribute
export const setAttribute = mutation({
  args: { 
    userId: v.string(), 
    attributeId: v.string(), 
    value: v.any() 
  },
  handler: async (ctx, args) => {
    const existingRecord = await ctx.db
      .query("user_access_map")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (existingRecord) {
      // Update attributes
      const updatedAttributes = { 
        ...existingRecord.attributes, 
        [args.attributeId]: args.value 
      };
      
      await ctx.db.patch(existingRecord._id, {
        attributes: updatedAttributes
      });
    } else {
      // Create new record with attribute
      await ctx.db.insert("user_access_map", {
        userId: args.userId,
        roleIds: [],
        attributes: { [args.attributeId]: args.value }
      });
    }
  },
});