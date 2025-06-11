import { shouldUseLocalStorage, getAuthStorageKey } from './environment';

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  guestToken?: string;
}

export function setAuthToken(tokenType: 'access' | 'refresh' | 'guest', token: string): void {
  if (!shouldUseLocalStorage()) return;
  
  try {
    localStorage.setItem(getAuthStorageKey(tokenType), token);
  } catch (error) {
    console.warn('Failed to store auth token in localStorage:', error);
  }
}

export function getAuthToken(tokenType: 'access' | 'refresh' | 'guest'): string | null {
  if (!shouldUseLocalStorage()) return null;
  
  try {
    return localStorage.getItem(getAuthStorageKey(tokenType));
  } catch (error) {
    console.warn('Failed to retrieve auth token from localStorage:', error);
    return null;
  }
}

export function removeAuthToken(tokenType: 'access' | 'refresh' | 'guest'): void {
  if (!shouldUseLocalStorage()) return;
  
  try {
    localStorage.removeItem(getAuthStorageKey(tokenType));
  } catch (error) {
    console.warn('Failed to remove auth token from localStorage:', error);
  }
}

export function clearAllAuthTokens(): void {
  if (!shouldUseLocalStorage()) return;
  
  removeAuthToken('access');
  removeAuthToken('refresh');
  removeAuthToken('guest');
}

export function getAllAuthTokens(): AuthTokens {
  if (!shouldUseLocalStorage()) return {};
  
  return {
    accessToken: getAuthToken('access') || undefined,
    refreshToken: getAuthToken('refresh') || undefined,
    guestToken: getAuthToken('guest') || undefined,
  };
}
