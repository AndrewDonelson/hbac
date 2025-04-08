import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Define valid attribute types
const VALID_ATTRIBUTE_TYPES = ['string', 'number', 'boolean', 'object', 'array'];

// Create a new attribute definition
export const createAttribute = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    type: v.string(),
    description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Validate attribute type
    if (!VALID_ATTRIBUTE_TYPES.includes(args.type)) {
      throw new Error(`Invalid attribute type. Must be one of: ${VALID_ATTRIBUTE_TYPES.join(', ')}`);
    }

    // Check if attribute already exists
    const existingAttribute = await ctx.db
      .query("attributes")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (existingAttribute) {
      throw new Error(`Attribute with ID ${args.id} already exists`);
    }

    // Insert new attribute definition
    return await ctx.db.insert("attributes", {
      id: args.id,
      name: args.name,
      type: args.type,
      description: args.description
    });
  },
});

// Update an existing attribute definition
export const updateAttribute = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existingAttribute = await ctx.db
      .query("attributes")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!existingAttribute) {
      throw new Error(`Attribute with ID ${args.id} not found`);
    }

    // Validate attribute type if provided
    if (args.type && !VALID_ATTRIBUTE_TYPES.includes(args.type)) {
      throw new Error(`Invalid attribute type. Must be one of: ${VALID_ATTRIBUTE_TYPES.join(', ')}`);
    }

    // Prepare update object with only provided fields
    const updateData: Record<string, any> = {};
    if (args.name) updateData.name = args.name;
    if (args.type) updateData.type = args.type;
    if (args.description) updateData.description = args.description;

    await ctx.db.patch(existingAttribute._id, updateData);
  },
});

// Delete an attribute definition
export const deleteAttribute = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existingAttribute = await ctx.db
      .query("attributes")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!existingAttribute) {
      throw new Error(`Attribute with ID ${args.id} not found`);
    }

    // Remove the attribute definition
    await ctx.db.delete(existingAttribute._id);

    // Remove this attribute from all user access maps
    const userAccessMaps = await ctx.db
      .query("user_access_map")
      .collect();
    
    for (const userMap of userAccessMaps) {
      if (userMap.attributes[args.id] !== undefined) {
        const updatedAttributes = { ...userMap.attributes };
        delete updatedAttributes[args.id];
        
        await ctx.db.patch(userMap._id, { attributes: updatedAttributes });
      }
    }
  },
});

// Get all attribute definitions
export const getAllAttributes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("attributes").collect();
  },
});

// Get a specific attribute by ID
export const getAttributeById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attributes")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
  },
});

// Validate an attribute value based on its type
export const validateAttributeValue = query({
  args: { 
    id: v.string(), 
    value: v.any() 
  },
  handler: async (ctx, args) => {
    const attribute = await ctx.db
      .query("attributes")
      .filter(q => q.eq(q.field("id"), args.id))
      .first();
    
    if (!attribute) {
      throw new Error(`Attribute with ID ${args.id} not found`);
    }

    // Perform type validation
    switch (attribute.type) {
      case 'string':
        return typeof args.value === 'string';
      case 'number':
        return typeof args.value === 'number';
      case 'boolean':
        return typeof args.value === 'boolean';
      case 'object':
        return typeof args.value === 'object' && args.value !== null && !Array.isArray(args.value);
      case 'array':
        return Array.isArray(args.value);
      default:
        return false;
    }
  },
});