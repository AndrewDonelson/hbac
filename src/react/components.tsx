// file: src/react/components.tsx
// description: React hooks and components for integrating HBAC with React applications

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode, 
  ReactElement 
} from 'react';

/**
 * HBAC client for browser-based permission checks
 */
export class HBACClient {
  /**
   * Creates a new HBACClient instance
   * 
   * @param apiUrl Base URL for the HBAC API endpoints
   */
  constructor(private apiUrl: string) {}

  /**
   * Checks if a user has permission to perform an action on a resource
   * 
   * @param userId Unique user identifier
   * @param action Action to perform
   * @param resource Resource to access
   * @param context Additional context for permission check
   * @returns Promise resolving to boolean indicating permission
   */
  public async can(
    userId: string,
    action: string,
    resource: string,
    context: Record<string, any> = {}
  ): Promise<boolean> {
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
      
      if (!response.ok) {
        throw new Error('Permission check failed');
      }
      
      const data = await response.json();
      return data.allowed;
    } catch (error) {
      console.error('HBAC permission check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Retrieves roles for a specific user
   * 
   * @param userId Unique user identifier
   * @returns Promise resolving to array of role identifiers
   */
  public async getUserRoles(userId: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiUrl}/roles/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user roles');
      }
      
      const data = await response.json();
      return data.roles || [];
    } catch (error) {
      console.error('Failed to get user roles:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Retrieves attributes for a specific user
   * 
   * @param userId Unique user identifier
   * @returns Promise resolving to map of attribute identifiers and values
   */
  public async getUserAttributes(userId: string): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.apiUrl}/attributes/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user attributes');
      }
      
      const data = await response.json();
      return data.attributes || {};
    } catch (error) {
      console.error('Failed to get user attributes:', error instanceof Error ? error.message : error);
      return {};
    }
  }
}

/**
 * Shape of the HBAC React context
 */
export interface HBACContextType {
  client: HBACClient | null;
  userId: string | null;
  can: (action: string, resource: string, context?: any) => Promise<boolean>;
  roles: string[];
  attributes: Record<string, any>;
  loading: boolean;
}

/**
 * Default HBAC context value
 */
const defaultHBACContext: HBACContextType = {
  client: null,
  userId: null,
  can: async () => false,
  roles: [],
  attributes: {},
  loading: true
};

/**
 * HBAC React context for managing access control state
 */
const HBACContext = createContext<HBACContextType>(defaultHBACContext);

/**
 * Props for the HBAC provider component
 */
interface HBACProviderProps {
  children: ReactNode;
  client: HBACClient;
  userId: string | null;
}

/**
 * Provider component for HBAC context
 * 
 * @param props Provider configuration
 * @returns React component providing HBAC context
 */
export function HBACProvider({ 
  children, 
  client, 
  userId 
}: HBACProviderProps): ReactElement {
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
        console.error('Failed to load user data:', error instanceof Error ? error.message : error);
      } finally {
        setLoading(false);
      }
    }
    
    setLoading(true);
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

/**
 * Hook for accessing HBAC context in React components
 * 
 * @returns HBAC context value
 * @throws Error if used outside of HBACProvider
 */
export function useHBAC(): HBACContextType {
  const context = useContext(HBACContext);
  
  if (!context) {
    throw new Error('useHBAC must be used within an HBACProvider');
  }
  
  return context;
}

/**
 * Hook for checking permissions in React components
 * 
 * @param action Action to check
 * @param resource Resource to check
 * @param context Optional additional context
 * @returns Object with permission state
 */
export function usePermission(
  action: string,
  resource: string,
  context?: Record<string, any>
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
        console.error('Permission check failed:', error instanceof Error ? error.message : error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }
    
    setLoading(true);
    checkPermission();
  }, [can, action, resource, context, hbacLoading]);
  
  return { allowed, loading: loading || hbacLoading };
}