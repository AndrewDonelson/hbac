import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  user_access_map: defineTable({
    userId: v.string(),
    roleIds: v.array(v.string()),
    attributes: v.object(v.any()),
  }).index("by_userId", ["userId"]),

  roles: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string())
  }).index("by_id", ["id"]),

  attributes: defineTable({
    id: v.string(),
    name: v.string(),
    type: v.string(),
    description: v.optional(v.string())
  }).index("by_id", ["id"])
});