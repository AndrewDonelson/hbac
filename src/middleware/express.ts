// file: src/middleware/express.ts
// description: Express middleware for protecting routes with HBAC access control

import { Request, Response, NextFunction } from 'express';
import { HBAC } from '../HBAC';

/**
 * Extended Request interface to support authentication middleware
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    sub?: string;
    [key: string]: any;
  };
  session?: {
    userId?: string;
    [key: string]: any;
  };
}

/**
 * Options for configuring the HBAC route protection middleware
 */
interface ProtectOptions {
  /**
   * Optional function to extract context from the request
   */
  getContext?: (req: AuthenticatedRequest) => Record<string, any>;
  
  /**
   * Optional function to extract user ID from the request
   */
  getUserId?: (req: AuthenticatedRequest) => string | null;
}

/**
 * Creates an Express middleware function to protect routes using HBAC
 * 
 * @param hbac HBAC instance for access control
 * @param action Action being performed on the resource
 * @param resource Resource being accessed
 * @param options Optional configuration for user ID and context extraction
 * @returns Express middleware function
 */
export function protect(
  hbac: HBAC,
  action: string,
  resource: string,
  options: ProtectOptions = {}
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Extract user ID, with fallback to default methods
      const getUserId = options.getUserId || defaultGetUserId;
      const userId = getUserId(req);
      
      // If no user ID is found, return unauthorized
      if (!userId) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user identifier found' 
        });
      }
      
      // Extract context, with fallback to empty object
      const getContext = options.getContext || (() => ({}));
      const context = getContext(req);
      
      // Check permission using HBAC
      const allowed = await hbac.can(userId, action, resource, context);
      
      // If not allowed, return forbidden
      if (!allowed) {
        return res.status(403).json({ 
          message: 'Access denied',
          details: { action, resource }
        });
      }
      
      // Permission granted, proceed to next middleware
      next();
    } catch (error) {
      // Handle any unexpected errors during permission check
      console.error('HBAC middleware error:', error);
      return res.status(500).json({ 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };
}

/**
 * Default method to extract user ID from request
 * 
 * @param req Authenticated request object
 * @returns User ID or null
 */
function defaultGetUserId(req: AuthenticatedRequest): string | null {
  // Check common authentication middleware properties
  return (
    req.user?.id || 
    req.user?.sub || 
    req.session?.userId || 
    null
  );
}