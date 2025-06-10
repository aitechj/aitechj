import { isVercelPreview, getAuthStorageKey } from './environment';

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  guestToken?: string;
}

export function setAuthToken(tokenType: 'access' | 'refresh' | 'guest', token: string): void {
  if (!isVercelPreview()) return;
  
  try {
    localStorage.setItem(getAuthStorageKey(tokenType), token);
  } catch (error) {
    console.warn('Failed to store auth token in localStorage:', error);
  }
}

export function getAuthToken(tokenType: 'access' | 'refresh' | 'guest'): string | null {
  if (!isVercelPreview()) return null;
  
  try {
    return localStorage.getItem(getAuthStorageKey(tokenType));
  } catch (error) {
    console.warn('Failed to retrieve auth token from localStorage:', error);
    return null;
  }
}

export function removeAuthToken(tokenType: 'access' | 'refresh' | 'guest'): void {
  if (!isVercelPreview()) return;
  
  try {
    localStorage.removeItem(getAuthStorageKey(tokenType));
  } catch (error) {
    console.warn('Failed to remove auth token from localStorage:', error);
  }
}

export function clearAllAuthTokens(): void {
  if (!isVercelPreview()) return;
  
  removeAuthToken('access');
  removeAuthToken('refresh');
  removeAuthToken('guest');
}

export function getAllAuthTokens(): AuthTokens {
  if (!isVercelPreview()) return {};
  
  return {
    accessToken: getAuthToken('access') || undefined,
    refreshToken: getAuthToken('refresh') || undefined,
    guestToken: getAuthToken('guest') || undefined,
  };
}
