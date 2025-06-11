import { shouldUseLocalStorage, getAuthStorageKey } from './environment';

export function setGuestToken(token: string): void {
  if (!shouldUseLocalStorage()) return;
  
  try {
    localStorage.setItem(getAuthStorageKey('guest'), token);
  } catch (error) {
    console.warn('Failed to store guest token in localStorage:', error);
  }
}

export function getGuestToken(): string | null {
  if (!shouldUseLocalStorage()) return null;
  
  try {
    return localStorage.getItem(getAuthStorageKey('guest'));
  } catch (error) {
    console.warn('Failed to retrieve guest token from localStorage:', error);
    return null;
  }
}

export function removeGuestToken(): void {
  if (!shouldUseLocalStorage()) return;
  
  try {
    localStorage.removeItem(getAuthStorageKey('guest'));
  } catch (error) {
    console.warn('Failed to remove guest token from localStorage:', error);
  }
}
