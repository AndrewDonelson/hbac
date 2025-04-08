// file: src/index.ts
// description: Main entry point for exporting HBAC functionality, providing access to core classes, middleware, and hooks

// Export HBAC class
export { HBAC } from './HBAC';

// Export middleware
export { protect } from './middleware/express';

// Export React hooks
export { HBACClient, HBACProvider, useHBAC, usePermission } from './react';

// Export types
export * from './types';
export * from './interfaces/config';
export * from './interfaces/database';