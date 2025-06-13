'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllAuthTokens, clearAllAuthTokens, setAuthToken, getAuthToken } from '../lib/auth/client-storage';
import { shouldUseLocalStorage } from '../lib/auth/environment';


export interface User {
  id: string;
  name: string;
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
    console.log('🔍 useAuth.login() called with email:', email);
    try {
      console.log('📡 Making fetch request to /api/auth/login');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Fetch response received, status:', response.status, 'ok:', response.ok);

      if (response.ok) {
        console.log('✅ Response OK, parsing JSON...');
        const data = await response.json();
        console.log('📄 Response data:', data);
        console.log('🔍 shouldUseLocalStorage():', shouldUseLocalStorage());
        console.log('🔍 data.tokens exists:', !!data.tokens);
        console.log('🔍 data.user exists:', !!data.user);
        
        if (shouldUseLocalStorage() && data.tokens) {
          console.log('💾 Storing tokens in localStorage');
          if (data.tokens.accessToken) {
            setAuthToken('access', data.tokens.accessToken);
            console.log('💾 Stored access token');
          }
          if (data.tokens.refreshToken) {
            setAuthToken('refresh', data.tokens.refreshToken);
            console.log('💾 Stored refresh token');
          }
        } else {
          console.log('⚠️ Not storing tokens - shouldUseLocalStorage:', shouldUseLocalStorage(), 'data.tokens:', !!data.tokens);
        }
        
        if (shouldUseLocalStorage() && data.guestToken) {
          setAuthToken('guest', data.guestToken);
          console.log('💾 Stored guest token');
        }
        
        console.log('🔄 Updating auth state...');
        setAuthState((prev: AuthState) => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        }));
        
        updateTokens();
        console.log('✅ Login successful, returning success');
        return { success: true, user: data.user };
      } else {
        console.log('❌ Response not OK, parsing error...');
        const errorData = await response.json();
        console.log('❌ Error data:', errorData);
        return { success: false, error: errorData.error || 'Login failed' };
      }
    } catch (error) {
      console.error('🔥 Login error:', error);
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
    const initializeAuth = async () => {
      console.log('🔍 Initializing authentication...');
      
      updateTokens();
      
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ User data fetched from server:', data.user);
          setAuthState((prev: AuthState) => ({
            ...prev,
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          }));
        } else {
          console.log('⚠️ No authenticated user found on server');
          setAuthState((prev: AuthState) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('❌ Failed to fetch user data:', error);
        setAuthState((prev: AuthState) => ({ ...prev, isLoading: false }));
      }
    };
    
    initializeAuth();
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
