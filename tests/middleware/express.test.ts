// file: tests/middleware/express.test.ts
// description: Tests for the Express middleware component

import { Request, Response, NextFunction } from 'express';
import { HBAC } from '../../src/HBAC';
import { protect, AuthenticatedRequest } from '../../src/middleware/express';

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn(); // Suppress console.error
});

afterAll(() => {
  console.error = originalConsoleError; // Restore original console.error
});

// Mock HBAC
jest.mock('../../src/HBAC');

describe('Express Middleware', () => {
  // Setup mocks
  let mockHBAC: jest.Mocked<HBAC>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock HBAC instance
    mockHBAC = new HBAC('./config.json') as jest.Mocked<HBAC>;
    mockHBAC.can = jest.fn();
    
    // Create mock Express objects
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test('should continue when user has permission', async () => {
    // Setup request with user
    mockRequest = {
      user: { id: 'user123', name: 'Test User' },
    };
    
    // Setup HBAC to allow access
    mockHBAC.can.mockResolvedValueOnce(true);
    
    // Create middleware
    const middleware = protect(
      mockHBAC,
      'read',
      'posts'
    );
    
    // Call middleware
    await middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    
    // Should call HBAC.can with correct parameters
    expect(mockHBAC.can).toHaveBeenCalledWith(
      'user123',
      'read',
      'posts',
      {}
    );
    
    // Should call next
    expect(mockNext).toHaveBeenCalled();
    
    // Should not call response methods
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  test('should deny access when user does not have permission', async () => {
    // Setup request with user
    mockRequest = {
      user: { id: 'user123', name: 'Test User' },
    };
    
    // Setup HBAC to deny access
    mockHBAC.can.mockResolvedValueOnce(false);
    
    // Create middleware
    const middleware = protect(
      mockHBAC,
      'write',
      'posts'
    );
    
    // Call middleware
    await middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    
    // Should call HBAC.can with correct parameters
    expect(mockHBAC.can).toHaveBeenCalledWith(
      'user123',
      'write',
      'posts',
      {}
    );
    
    // Should not call next
    expect(mockNext).not.toHaveBeenCalled();
    
    // Should return 403 response
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Access denied',
        details: { action: 'write', resource: 'posts' }
      })
    );
  });

  test('should return 401 when no user is provided', async () => {
    // Setup request without user
    mockRequest = {};
    
    // Create middleware
    const middleware = protect(
      mockHBAC,
      'read',
      'posts'
    );
    
    // Call middleware
    await middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    
    // Should not call HBAC.can
    expect(mockHBAC.can).not.toHaveBeenCalled();
    
    // Should not call next
    expect(mockNext).not.toHaveBeenCalled();
    
    // Should return 401 response
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Authentication required'
      })
    );
  });

  test('should use custom getUserId function when provided', async () => {
    // Setup request with session instead of user
    mockRequest = {
      session: { userId: 'session-user-123' },
    };
    
    // Setup HBAC to allow access
    mockHBAC.can.mockResolvedValueOnce(true);
    
    // Create middleware with custom getUserId
    const middleware = protect(
      mockHBAC,
      'read',
      'posts',
      {
        getUserId: (req) => req.session?.userId || null,
      }
    );
    
    // Call middleware
    await middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    
    // Should call HBAC.can with session userId
    expect(mockHBAC.can).toHaveBeenCalledWith(
      'session-user-123',
      'read',
      'posts',
      {}
    );
    
    // Should call next
    expect(mockNext).toHaveBeenCalled();
  });

  test('should use custom getContext function when provided', async () => {
    // Setup request with user and params
    mockRequest = {
      user: { id: 'user123' },
      params: { id: 'post-123' },
    };
    
    // Setup HBAC to allow access
    mockHBAC.can.mockResolvedValueOnce(true);
    
    // Create middleware with custom getContext
    const middleware = protect(
      mockHBAC,
      'read',
      'posts',
      {
        getContext: (req) => ({
          postId: req.params?.id,
          timestamp: expect.any(Number),
        }),
      }
    );
    
    // Call middleware
    await middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    
    // Should call HBAC.can with custom context
    expect(mockHBAC.can).toHaveBeenCalledWith(
      'user123',
      'read',
      'posts',
      expect.objectContaining({
        postId: 'post-123',
        timestamp: expect.any(Number),
      })
    );
    
    // Should call next
    expect(mockNext).toHaveBeenCalled();
  });

  test('should handle errors gracefully', async () => {
    // Setup request with user
    mockRequest = {
      user: { id: 'user123' },
    };
    
    // Setup HBAC to throw error
    mockHBAC.can.mockRejectedValueOnce(new Error('Test error'));
    
    // Create middleware
    const middleware = protect(
      mockHBAC,
      'read',
      'posts'
    );
    
    // Call middleware
    await middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    
    // Should not call next
    expect(mockNext).not.toHaveBeenCalled();
    
    // Should return 500 response
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error',
        error: 'Test error'
      })
    );
  });

  test('should fall back to user sub when id is not available', async () => {
    // Setup request with user without id but with sub
    mockRequest = {
      user: { sub: 'user-sub-123' },
    };
    
    // Setup HBAC to allow access
    mockHBAC.can.mockResolvedValueOnce(true);
    
    // Create middleware
    const middleware = protect(
      mockHBAC,
      'read',
      'posts'
    );
    
    // Call middleware
    await middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    
    // Should call HBAC.can with sub
    expect(mockHBAC.can).toHaveBeenCalledWith(
      'user-sub-123',
      'read',
      'posts',
      {}
    );
    
    // Should call next
    expect(mockNext).toHaveBeenCalled();
  });

  test('should check for session userId when user object is not available', async () => {
    // Setup request with session but no user
    mockRequest = {
      session: { userId: 'session-user-123' },
    };
    
    // Setup HBAC to allow access
    mockHBAC.can.mockResolvedValueOnce(true);
    
    // Create middleware
    const middleware = protect(
      mockHBAC,
      'read',
      'posts'
    );
    
    // Call middleware
    await middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    
    // Should call HBAC.can with session userId
    expect(mockHBAC.can).toHaveBeenCalledWith(
      'session-user-123',
      'read',
      'posts',
      {}
    );
    
    // Should call next
    expect(mockNext).toHaveBeenCalled();
  });
});