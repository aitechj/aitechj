import { isVercelPreview } from './environment';
import { setAuthToken, getAuthToken } from './client-storage';

export async function refreshTokens(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isVercelPreview()) {
      const refreshToken = getAuthToken('refresh');
      if (refreshToken) {
        headers['Authorization'] = `Bearer ${refreshToken}`;
      }
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      
      if (isVercelPreview() && data.tokens) {
        if (data.tokens.accessToken) {
          setAuthToken('access', data.tokens.accessToken);
        }
        if (data.tokens.refreshToken) {
          setAuthToken('refresh', data.tokens.refreshToken);
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}
