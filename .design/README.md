# HBAC (Hybrid-Based Access Control) Comprehensive Design Document

## 1. Introduction

### 1.1 Purpose
HBAC is a Node.js package that implements a hybrid Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) system. It aims to provide flexible, scalable, and easy-to-implement access control for applications ranging from small blogs to enterprise-level platforms.

### 1.2 Scope
The package will provide a complete access control solution that can be configured through a simple configuration file (similar to tsconfig) and integrated with various database systems. It will support authentication, authorization, and access control at different granularity levels.

### 1.3 Key Features
- Hybrid RBAC/ABAC approach
- Simple configuration
- Convex database integration (default)
- Minimal database footprint
- Scalable from small to enterprise applications
- Performance-optimized access control decisions
- Easy integration with Express and other frameworks

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  Application    │────▶│  HBAC Package    │────▶│  Convex DB      │
│                 │     │                  │     │  (optional)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 2.2 Core Components

1. **Configuration Manager**: Handles the HBAC configuration file
2. **Role Manager**: Manages role definitions from config
3. **Attribute Manager**: Manages attribute definitions from config
4. **Policy Engine**: Evaluates access decisions based on roles and attributes
5. **Cache Manager**: Optimizes performance through caching
6. **Database Connector**: Simple connector for user-role-attribute associations

## 3. Data Model

### 3.1 Simplified Database Schema

HBAC will use a single table in Convex to map users to their roles and attributes:

```
user_access_map
├── id (PK)
├── userId
├── roleIds (array of role IDs defined in config)
└── attributes (JSON object of attribute IDs and values)
```

### 3.2 Type Definitions

```typescript
interface UserAccessMap {
  id: string;
  userId: string;
  roleIds: string[];
  attributes: Record<string, any>;
}
```

## 4. Configuration

### 4.1 Configuration File (hbac.config.json)

```json
{
  "version": "1.0",
  "database": {
    "type": "convex", // default, can be changed
    "tableName": "user_access_map" // default name
  },
  "cache": {
    "enabled": true,
    "ttl": 300 // seconds
  },
  "audit": {
    "enabled": true,
    "level": "info" // error, warn, info, debug
  },
  "policies": {
    "defaultEffect": "deny",
    "evaluation": "firstApplicable" // or allApplicable, denyOverrides
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

## 5. API Design

### 5.1 Core API

```typescript
// Initialize HBAC
const hbac = new HBAC('./hbac.config.json');
await hbac.initialize();

// User Management
async function assignRole(userId: string, roleId: string): Promise<void>
async function removeRole(userId: string, roleId: string): Promise<void>
async function setAttribute(userId: string, attributeId: string, value: any): Promise<void>

// Access Control
async function can(userId: string, action: string, resource: string, context?: object): Promise<boolean>
async function check(userId: string, action: string, resource: string, context?: object): Promise<void> // Throws if denied

// Utility
async function getUserRoles(userId: string): Promise<string[]>
async function getUserAttributes(userId: string): Promise<Record<string, any>>
```

### 5.2 Function-Based Middleware

```typescript
// Direct function-based middleware for Express
import express from 'express';
import { protect } from 'hbac';

const app = express();

// Initialize HBAC in your app bootstrap
const hbac = await initializeHBAC('./hbac.config.json');

// Using the direct function from the package
app.get('/posts/:id', protect(hbac, 'read', 'posts'), (req, res) => {
  // Access granted, handle the request
});

// With context from request
app.put('/posts/:id', protect(hbac, 'update', 'posts', {
  getContext: (req) => ({ 
    postId: req.params.id,
    // Additional context from request
  })
}), (req, res) => {
  // Access granted, handle the request
});
```

### 5.3 Direct Function Usage

```typescript
import { HBAC } from 'hbac';

const hbac = new HBAC('./hbac.config.json');
await hbac.initialize();

// Example controller function
async function getPost(userId, postId) {
  // Direct function call to check access
  await hbac.check(userId, 'read', 'posts', { postId });
  
  // If we get here, access is granted
  return fetchPostFromDatabase(postId);
}

// Example with conditional logic
async function updatePost(userId, postId, data) {
  // Check if user has access
  const hasAccess = await hbac.can(userId, 'update', 'posts', { postId });
  
  if (hasAccess) {
    return updatePostInDatabase(postId, data);
  } else {
    throw new Error('Access denied');
  }
}
```

## 6. Implementation Approach

### 6.1 Core Implementation

1. **Configuration-First Approach**:
   - Load and validate the configuration file
   - Use configuration as the primary source of access control rules
   - Keep database interactions minimal

2. **Convex Database Integration**:
   - Use Convex as the default database for storing user-role-attribute associations
   - Provide a simple adapter for other databases

3. **Policy Evaluation**:
   - Implement the policy engine based on the configuration
   - Support complex conditions with attribute comparisons

4. **Caching Strategy**:
   - Cache user roles and attributes for faster access decisions
   - Invalidate cache on role or attribute changes

### 6.2 Optimizations

1. **In-Memory Configuration**:
   - Keep the entire configuration in memory for fast lookups
   - Avoid database queries for policy rules or role definitions

2. **Role Lookup**:
   - Use efficient data structures for role permission lookups
   - Pre-process role permissions during initialization

3. **Attribute Evaluation**:
   - Optimize attribute condition evaluation for common patterns
   - Use short-circuit evaluation for complex conditions

### 6.3 Security Considerations

1. **Input Validation**:
   - Validate all inputs to prevent injection attacks
   - Sanitize user inputs in policy conditions

2. **Least Privilege**:
   - Design APIs to follow the principle of least privilege
   - Validate all access control decisions

## 7. Integration Examples

### 7.1 Express.js Integration

```typescript
import express from 'express';
import { HBAC, protect } from 'hbac';

const app = express();
const hbac = new HBAC('./hbac.config.json');

// Initialize HBAC
await hbac.initialize();

// Using protect function directly from the package
app.get('/posts/:id', protect(hbac, 'read', 'posts'), (req, res) => {
  // Access granted, handle the request
});

// With context from request
app.delete('/posts/:id', protect(hbac, 'delete', 'posts', {
  getContext: (req) => ({ 
    postId: req.params.id,
    userId: req.user.id // Assuming authentication middleware sets this
  })
}), (req, res) => {
  // Access granted, handle the request
});
```

### 7.2 React Integration

```typescript
import { useHBAC } from 'hbac-react';

function AdminPanel() {
  const { can } = useHBAC();
  const userId = useCurrentUser().id;
  
  if (!can(userId, 'access', 'admin-panel')) {
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

### 7.3 Convex Integration

```typescript
import { HBAC } from 'hbac';
import { ConvexClient } from 'convex/client';

const convex = new ConvexClient(process.env.CONVEX_URL);
const hbac = new HBAC('./hbac.config.json');

// Use existing Convex connection
await hbac.initialize({
  convexClient: convex
});

// Example Convex mutation function
export async function createPost(
  ctx,
  args: { title: string; content: string }
) {
  const userId = ctx.auth.userId;
  
  // Check permission using HBAC
  const hasAccess = await ctx.runHBAC(userId, 'create', 'posts');
  
  if (!hasAccess) {
    throw new Error('Access denied');
  }
  
  // Create the post
  return ctx.db.insert('posts', {
    title: args.title,
    content: args.content,
    authorId: userId
  });
}
```

## 8. Convex Database Implementation

### 8.1 Convex Schema Definition

```typescript
// convex/schema.ts
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

### 8.2 Convex Functions for HBAC

```typescript
// convex/hbac.ts
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

## 9. Example Usage Scenarios

### 9.1 Small Blog Site

```typescript
// hbac.config.json for a small blog
{
  "roles": {
    "admin": {
      "id": "role_admin",
      "permissions": ["*:*"]
    },
    "author": {
      "id": "role_author",
      "permissions": [
        "posts:create",
        "posts:read",
        "posts:update:own",
        "posts:delete:own",
        "comments:moderate:own"
      ]
    },
    "subscriber": {
      "id": "role_subscriber",
      "permissions": [
        "posts:read",
        "comments:create",
        "comments:read"
      ]
    }
  },
  "attributes": {
    "isPremium": {
      "id": "attr_premium",
      "type": "boolean"
    }
  },
  "policyRules": [
    {
      "id": "policy_premium_content",
      "resource": "premium-content",
      "action": "read",
      "condition": {
        "attributes.isPremium": true
      },
      "effect": "allow"
    }
  ]
}
```

### 9.2 Enterprise Banking Application

```typescript
// hbac.config.json for a banking application
{
  "roles": {
    "admin": {
      "id": "role_admin",
      "permissions": ["*:*"]
    },
    "manager": {
      "id": "role_manager",
      "permissions": [
        "accounts:read",
        "transactions:read",
        "transactions:approve:limit-100000",
        "reports:generate",
        "customers:manage"
      ]
    },
    "teller": {
      "id": "role_teller",
      "permissions": [
        "accounts:read",
        "transactions:create:limit-5000",
        "customers:read"
      ]
    },
    "customer": {
      "id": "role_customer",
      "permissions": [
        "accounts:read:own",
        "transactions:read:own",
        "transactions:create:own:limit-1000"
      ]
    }
  },
  "attributes": {
    "department": {
      "id": "attr_department",
      "type": "string"
    },
    "region": {
      "id": "attr_region",
      "type": "string"
    },
    "riskLevel": {
      "id": "attr_risk",
      "type": "number"
    },
    "transactionLimit": {
      "id": "attr_tx_limit",
      "type": "number"
    }
  },
  "policyRules": [
    {
      "id": "policy_regional_access",
      "resource": "customer-data",
      "action": "read",
      "condition": {
        "context.customerRegion": { "$eq": "$user.attributes.region" }
      },
      "effect": "allow"
    },
    {
      "id": "policy_high_value_transactions",
      "resource": "transactions",
      "action": "approve",
      "condition": {
        "context.amount": { "$lte": "$user.attributes.transactionLimit" },
        "attributes.riskLevel": { "$lte": 2 }
      },
      "effect": "allow"
    }
  ]
}
```

## 10. Server-Side Function Usage Examples

### 10.1 Express.js Server Example

```typescript
// server.ts
import express from 'express';
import { HBAC } from 'hbac';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

// Initialize HBAC
const hbac = new HBAC('./hbac.config.json');
await hbac.initialize();

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

// Direct function usage in route handler
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

// Using the check function (throws error on denied)
app.get('/api/posts/:id', authenticate, async (req, res) => {
  try {
    // Will throw if access is denied
    await hbac.check(req.user.id, 'read', 'posts', { 
      postId: req.params.id 
    });
    
    // Access granted, fetch the post
    const post = await fetchPost(req.params.id);
    
    return res.json({ post });
  } catch (error) {
    if (error.message === 'Access denied') {
      return res.status(403).json({ message: 'Access denied' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// Using object ownership in context
app.put('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await fetchPost(req.params.id);
    
    // Check if user can update this specific post
    await hbac.check(req.user.id, 'update', 'posts', { 
      postId: req.params.id,
      authorId: post.authorId,
      isOwner: post.authorId === req.user.id
    });
    
    // Access granted, update the post
    const updatedPost = await updatePost(req.params.id, req.body);
    
    return res.json({ post: updatedPost });
  } catch (error) {
    if (error.message === 'Access denied') {
      return res.status(403).json({ message: 'Access denied' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// Role assignment endpoint
app.post('/api/admin/users/:userId/roles', authenticate, async (req, res) => {
  try {
    // Admin only endpoint
    await hbac.check(req.user.id, 'manage', 'users');
    
    const { roleId } = req.body;
    
    // Assign role to user
    await hbac.assignRole(req.params.userId, roleId);
    
    return res.json({ success: true });
  } catch (error) {
    if (error.message === 'Access denied') {
      return res.status(403).json({ message: 'Access denied' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// Attribute assignment endpoint
app.post('/api/admin/users/:userId/attributes', authenticate, async (req, res) => {
  try {
    // Admin only endpoint
    await hbac.check(req.user.id, 'manage', 'users');
    
    const { attributeId, value } = req.body;
    
    // Set attribute value for user
    await hbac.setAttribute(req.params.userId, attributeId, value);
    
    return res.json({ success: true });
  } catch (error) {
    if (error.message === 'Access denied') {
      return res.status(403).json({ message: 'Access denied' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 10.2 Next.js API Route Example

```typescript
// pages/api/posts/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { HBAC } from 'hbac';
import { getSession } from 'next-auth/react';

// Initialize HBAC (in a real app, this would be done outside the handler)
const hbac = new HBAC('./hbac.config.json');
await hbac.initialize();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const { id } = req.query;
  const userId = session.user.id;
  
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
```

### 10.3 Convex Server Functions Example

```typescript
// convex/posts.ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getHBAC } from './hbac';

// Get all posts with permission check
export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) throw new Error('Unauthorized');
    
    const userId = auth.subject;
    const hbac = getHBAC(ctx);
    
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
    const hbac = getHBAC(ctx);
    
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
    const hbac = getHBAC(ctx);
    
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

## 11. Client-Side Function Usage Examples

### 11.1 React Hook Implementation

```typescript
// hbac-react.ts
import { createContext, useContext, useState, useEffect } from 'react';

// HBAC Client for browser
export class HBACClient {
  constructor(private apiUrl: string) {}
  
  async can(userId: string, action: string, resource: string, context?: any): Promise<boolean> {
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
  
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiUrl}/roles/${userId}`);
      const data = await response.json();
      return data.roles;
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return [];
    }
  }
  
  async getUserAttributes(userId: string): Promise<Record<string, any>> {
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

// Create context for HBAC
const HBACContext = createContext<{
  client: HBACClient | null;
  userId: string | null;
  can: (action: string, resource: string, context?: any) => Promise<boolean>;
  roles: string[];
  attributes: Record<string, any>;
  loading: boolean;
}>({
  client: null,
  userId: null,
  can: async () => false,
  roles: [],
  attributes: {},
  loading: true
});

// HBAC provider component
export function HBACProvider({ 
  children, 
  client, 
  userId 
}: { 
  children: React.ReactNode; 
  client: HBACClient; 
  userId: string | null;
}) {
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

// Hook to use HBAC in components
export function useHBAC() {
  const context = useContext(HBACContext);
  
  if (!context) {
    throw new Error('useHBAC must be used within an HBACProvider');
  }
  
  return context;
}
```

## 11.2 React Component Usage (continued)

```tsx
// App.tsx
import { HBACProvider, HBACClient } from './hbac-react';
import { useAuth } from './auth-context'; // Your authentication provider

function App() {
  const { user } = useAuth();
  const hbacClient = new HBACClient('/api/hbac');
  
  return (
    <HBACProvider client={hbacClient} userId={user?.id || null}>
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/posts/:id/edit" element={<EditPostPage />} />
        </Routes>
      </Router>
    </HBACProvider>
  );
}
```

### 11.3 Component with Permission Check

```tsx
// AdminPage.tsx
import { useEffect, useState } from 'react';
import { useHBAC } from './hbac-react';
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
```

### 11.4 Conditional Rendering Based on Permissions

```tsx
// PostActions.tsx
import { useState, useEffect } from 'react';
import { useHBAC } from './hbac-react';

interface PostActionsProps {
  postId: string;
  authorId: string;
}

function PostActions({ postId, authorId }: PostActionsProps) {
  const { can, userId, loading } = useHBAC();
  const [permissions, setPermissions] = useState({
    canEdit: false,
    canDelete: false,
    canPublish: false
  });
  
  useEffect(() => {
    async function checkPermissions() {
      if (loading || !userId) return;
      
      const context = { 
        postId, 
        authorId,
        isOwner: userId === authorId
      };
      
      const [canEdit, canDelete, canPublish] = await Promise.all([
        can('update', 'posts', context),
        can('delete', 'posts', context),
        can('publish', 'posts', context)
      ]);
      
      setPermissions({ canEdit, canDelete, canPublish });
    }
    
    checkPermissions();
  }, [can, postId, authorId, userId, loading]);
  
  if (loading) {
    return <div>Loading actions...</div>;
  }
  
  return (
    <div className="post-actions">
      {permissions.canEdit && (
        <button className="edit-button">Edit Post</button>
      )}
      
      {permissions.canDelete && (
        <button className="delete-button">Delete Post</button>
      )}
      
      {permissions.canPublish && (
        <button className="publish-button">Publish Post</button>
      )}
    </div>
  );
}
```

### 11.5 Custom Permission Hook

```tsx
// usePermission.ts
import { useState, useEffect } from 'react';
import { useHBAC } from './hbac-react';

export function usePermission(
  action: string, 
  resource: string, 
  context?: any
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
    
    checkPermission();
  }, [can, action, resource, context, hbacLoading]);
  
  return { allowed, loading: loading || hbacLoading };
}

// Usage example
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
```

## 12. HBAC API Endpoints Implementation

```typescript
// api/hbac.ts (Express implementation)
import express from 'express';
import { HBAC } from 'hbac';

const router = express.Router();
const hbac = new HBAC('./hbac.config.json');

// Initialize HBAC on server start
(async () => {
  await hbac.initialize();
  console.log('HBAC initialized');
})();

// Check if a user has permission
router.post('/can', async (req, res) => {
  try {
    const { userId, action, resource, context } = req.body;
    
    if (!userId || !action || !resource) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        allowed: false 
      });
    }
    
    const allowed = await hbac.can(userId, action, resource, context);
    return res.json({ allowed });
  } catch (error) {
    console.error('HBAC check error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      allowed: false 
    });
  }
});

// Get user roles
router.get('/roles/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const roles = await hbac.getUserRoles(userId);
    return res.json({ roles });
  } catch (error) {
    console.error('Get user roles error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      roles: [] 
    });
  }
});

// Get user attributes
router.get('/attributes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const attributes = await hbac.getUserAttributes(userId);
    return res.json({ attributes });
  } catch (error) {
    console.error('Get user attributes error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      attributes: {} 
    });
  }
});

// Assign role to user (admin only)
router.post('/roles', async (req, res) => {
  try {
    const { adminId, userId, roleId } = req.body;
    
    // Check if admin has permission
    const hasPermission = await hbac.can(adminId, 'assign', 'roles');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await hbac.assignRole(userId, roleId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Assign role error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      success: false 
    });
  }
});

// Set user attribute (admin only)
router.post('/attributes', async (req, res) => {
  try {
    const { adminId, userId, attributeId, value } = req.body;
    
    // Check if admin has permission
    const hasPermission = await hbac.can(adminId, 'manage', 'attributes');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await hbac.setAttribute(userId, attributeId, value);
    return res.json({ success: true });
  } catch (error) {
    console.error('Set attribute error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      success: false 
    });
  }
});

export default router;
```

## 13. Implementation Roadmap

### 13.1 Phase 1: Core Functionality

1. Configuration parsing and validation
2. Role-based access control implementation
3. Attribute-based condition evaluation
4. Basic Convex database integration
5. Core API implementation (can, check, assignRole, setAttribute)

### 13.2 Phase 2: Performance Optimizations

1. In-memory caching of roles and permissions
2. Optimized policy evaluation algorithms
3. Batch operations for role and attribute assignments
4. Query optimization for database operations

### 13.3 Phase 3: Framework Integrations

1. Express middleware
2. React hooks and components
3. Next.js API route handlers
4. Convex function integrations

### 13.4 Phase 4: Advanced Features

1. Role hierarchy support
2. Dynamic policy rules
3. Audit logging
4. Policy simulation and testing tools
5. Admin interface for policy management

## 14. Performance Considerations

### 14.1 Caching Strategy

1. **User Role and Attribute Caching**:
   - Cache user roles and attributes in memory
   - Set appropriate TTL based on application needs
   - Invalidate cache on role or attribute changes

2. **Permission Decision Caching**:
   - Cache permission decisions for frequent access patterns
   - Use composite keys (userId + action + resource) for cache lookups

3. **Config Caching**:
   - Keep configuration in memory for fast lookups
   - Reload configuration only when changed

### 14.2 Optimization Techniques

1. **Batch Operations**:
   - Support batch role assignments for bulk user provisioning
   - Optimize database operations for multiple users

2. **Efficient Condition Evaluation**:
   - Use optimized algorithms for attribute condition evaluation
   - Implement short-circuit evaluation for complex conditions

3. **Indexed Lookups**:
   - Ensure proper database indexing for user lookups
   - Optimize query patterns for high-volume applications

## 15. Security Best Practices

### 15.1 Secure Configuration

1. **Configuration Validation**:
   - Validate configuration against schema
   - Prevent injection attacks in policy conditions
   - Support encryption of sensitive configuration values

2. **Principle of Least Privilege**:
   - Default deny all permissions
   - Require explicit grants for access

### 15.2 Authorization Enforcement

1. **Complete Mediation**:
   - Ensure all access paths are protected
   - Implement consistent authorization checks

2. **Defense in Depth**:
   - Combine with proper authentication
   - Use both frontend and backend enforcement

### 15.3 Audit and Monitoring

1. **Access Logs**:
   - Log all access decisions
   - Include context information in logs

2. **Anomaly Detection**:
   - Monitor for unusual access patterns
   - Alert on suspicious activity

## 16. Conclusion

The HBAC (Hybrid-Based Access Control) package provides a flexible, powerful, yet easy-to-use access control system that combines the best aspects of Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC). The design emphasizes simplicity of configuration while supporting complex access control scenarios.

Key benefits of the HBAC package include:

1. **Configuration-First Approach**: Access control rules defined in a simple JSON configuration file.
2. **Minimal Database Footprint**: Single table for user-role-attribute mappings.
3. **Flexible Integration**: Easy to integrate with Express, React, Next.js, and Convex.
4. **Scalable Design**: Suitable for applications of all sizes, from blogs to enterprise systems.
5. **Developer-Friendly API**: Intuitive functions for permission checks and role/attribute management.

By following this design document, developers can implement a comprehensive access control system that is both powerful and easy to maintain, suitable for a wide range of application scenarios.