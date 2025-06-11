export function isVercelPreview(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.vercel.app');
}

export function shouldUseLocalStorage(): boolean {
  return typeof window !== 'undefined';
}

export function getAuthStorageKey(tokenType: 'access' | 'refresh' | 'guest'): string {
  return `aitechj_${tokenType}_token`;
}
