'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllAuthTokens, clearAllAuthTokens, setAuthToken, getAuthToken } from '../lib/auth/client-storage';
import { shouldUseLocalStorage } from '../lib/auth/environment';


export interface User {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  emailVerified?: boolean;
  lastLogin?: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: {
    accessToken?: string;
    refreshToken?: string;
    guestToken?: string;
  };
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    tokens: {},
  });

  const updateTokens = useCallback(() => {
    if (shouldUseLocalStorage()) {
      const tokens = getAllAuthTokens();
      setAuthState((prev: AuthState) => ({
        ...prev,
        tokens,
        isAuthenticated: !!(tokens.accessToken || tokens.guestToken),
      }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (shouldUseLocalStorage() && data.tokens) {
          if (data.tokens.accessToken) {
            setAuthToken('access', data.tokens.accessToken);
          }
          if (data.tokens.refreshToken) {
            setAuthToken('refresh', data.tokens.refreshToken);
          }
        }
        
        if (shouldUseLocalStorage() && data.guestToken) {
          setAuthToken('guest', data.guestToken);
        }
        
        setAuthState((prev: AuthState) => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        }));
        
        updateTokens();
        return { success: true, user: data.user };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error occurred' };
    }
  }, [updateTokens]);

  const logout = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    
    clearAllAuthTokens();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      tokens: {},
    });
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    
    if (shouldUseLocalStorage()) {
      const tokens = getAllAuthTokens();
      if (tokens.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      } else if (tokens.guestToken) {
        headers['Authorization'] = `Bearer ${tokens.guestToken}`;
      }
    }
    
    return headers;
  }, []);

  useEffect(() => {
    updateTokens();
    setAuthState((prev: AuthState) => ({ ...prev, isLoading: false }));
  }, [updateTokens]);

  return {
    ...authState,
    login,
    logout,
    getAuthHeaders,
    updateTokens,
    refreshTokens: () => Promise.resolve(false),
  };
}
