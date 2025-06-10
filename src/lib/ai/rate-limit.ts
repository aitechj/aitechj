const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  try {
    const now = Date.now();
    const windowStart = Math.floor(now / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW;
    const key = `${userId}:${windowStart}`;
    
    const existing = rateLimitMap.get(key);
    const resetTime = windowStart + RATE_LIMIT_WINDOW;
    
    if (!existing || now >= resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - 1,
        resetTime: Math.floor(resetTime / 1000),
      };
    }
    
    if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.floor(resetTime / 1000),
      };
    }
    
    existing.count++;
    
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
      resetTime: Math.floor(resetTime / 1000),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: Math.floor((Date.now() + RATE_LIMIT_WINDOW) / 1000),
    };
  }
}
