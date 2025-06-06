import { kv } from '@vercel/kv';
import crypto from 'crypto';

export function generateCacheKey(messages: any[], contextContent?: string): string {
  const content = JSON.stringify(messages) + (contextContent || '');
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function getCachedResponse(cacheKey: string) {
  try {
    return await kv.get(cacheKey);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setCachedResponse(cacheKey: string, response: any) {
  try {
    await kv.set(cacheKey, response, { ex: 86400 });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}
