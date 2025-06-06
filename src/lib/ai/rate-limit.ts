import { kv } from '@vercel/kv';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / RATE_LIMIT_WINDOW);
    const key = `rate_limit:${userId}:${window}`;

    const current = await kv.get(key) as number || 0;
    
    if (current >= RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: (window + 1) * RATE_LIMIT_WINDOW,
      };
    }

    await kv.incr(key);
    await kv.expire(key, RATE_LIMIT_WINDOW);

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - current - 1,
      resetTime: (window + 1) * RATE_LIMIT_WINDOW,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW,
    };
  }
}
