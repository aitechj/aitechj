import crypto from 'crypto';

const cache = new Map<string, { data: any; expires: number }>();

export function generateCacheKey(messages: any[], contextContent?: string): string {
  const content = JSON.stringify(messages) + (contextContent || '');
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function getCachedResponse(cacheKey: string) {
  try {
    const entry = cache.get(cacheKey);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      cache.delete(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setCachedResponse(cacheKey: string, response: any) {
  try {
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    cache.set(cacheKey, { data: response, expires });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}
