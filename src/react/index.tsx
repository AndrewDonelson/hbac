// file: src/react/index.tsx
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
      console.error('HBAC permission check failed:', error);
      return false;
    }
  }

  /**
   * Retrieves roles for a specific user
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
      console.error('Failed to get user roles:', error);
      return [];
    }
  }

  /**
   * Retrieves attributes for a specific user
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
      console.error('Failed to get user attributes:', error);
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
        console.error('Failed to load user data:', error);
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