# HBAC (Hybrid-Based Access Control)

## Overview

HBAC is a powerful, flexible Node.js access control package that seamlessly combines Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC). Designed for scalability and ease of use, HBAC provides a comprehensive solution for managing permissions across various application types.

## Features

🔐 **Hybrid Access Control**

- Combines Role-Based and Attribute-Based access control
- Flexible permission management
- Granular access decisions

🔬 **Advanced Policy Engine**

- Multiple policy evaluation strategies
- Complex condition support
- Contextual permission checks

💾 **Multi-Database Support**

- Native connectors for:
  - Convex
  - MongoDB
  - PostgreSQL
  - LowDB (for testing/development)
- Easy to extend with custom database connectors

⚡ **Performance Optimized**

- In-memory caching
- Efficient permission checks
- Minimal database overhead

🔧 **Easy Integration**

- Express.js middleware
- React hooks
- Simple configuration
- TypeScript support

## Installation

```bash
npm install hbac
```

## Quick Start

### Configuration

Create a `hbac.config.json`:

```json
{
  "version": "1.0",
  "database": {
    "type": "mongodb",
    "connectionString": "mongodb://localhost:27017/myapp"
  },
  "roles": {
    "admin": {
      "id": "role_admin",
      "permissions": ["*:*"]
    },
    "editor": {
      "id": "role_editor",
      "permissions": ["posts:read", "posts:write"]
    }
  },
  "policies": {
    "defaultEffect": "deny",
    "evaluation": "firstApplicable"
  }
}
```

### Node.js Backend Example

```typescript
import { HBAC } from 'hbac';

// Initialize HBAC
const hbac = new HBAC('./hbac.config.json');
await hbac.initialize();

// Check permissions
const canEditPost = await hbac.can(
  'user123', 
  'edit', 
  'posts', 
  { postId: '456' }
);

// Assign roles
await hbac.assignRole('user123', 'role_editor');
```

### Express Middleware

```typescript
import express from 'express';
import { HBAC, protect } from 'hbac';

const app = express();
const hbac = new HBAC('./hbac.config.json');
await hbac.initialize();

// Protect routes
app.get('/posts/:id', 
  protect(hbac, 'read', 'posts', {
    getContext: (req) => ({ postId: req.params.id })
  }), 
  (req, res) => {
    // Access granted
  }
);
```

### React Integration

```tsx
import { HBACProvider, HBACClient, useHBAC, usePermission } from 'hbac';

function App() {
  const hbacClient = new HBACClient('/api/hbac');
  
  return (
    <HBACProvider client={hbacClient} userId={user.id}>
      <AdminPanel />
    </HBACProvider>
  );
}

function AdminPanel() {
  const { allowed } = usePermission('access', 'admin-panel');
  
  if (!allowed) return <AccessDenied />;
  
  return <div>Admin Content</div>;
}
```

## Configuration Options

- `database`: Configure database connection
- `roles`: Define application roles and permissions
- `attributes`: Create custom user attributes
- `policies`: Set default access control strategies
- `cache`: Configure caching behavior

## Supported Databases

- Convex
- MongoDB
- PostgreSQL
- LowDB (development/testing)

## Performance Considerations

- Configurable in-memory caching
- Minimal database queries
- Efficient permission evaluation
- Supports large-scale applications

## Security Best Practices

- Default deny policy
- Granular permission checks
- Attribute-level validation
- Supports complex access conditions

## Roadmap

- [ ] More database connectors
- [ ] Enhanced audit logging
- [ ] Policy simulation tools
- [ ] More integrations (Fastify, NestJS)

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

## License

MIT License

## Support

For support, please open an issue on our GitHub repository or contact our support team.