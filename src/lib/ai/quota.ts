import { db, aiConversations } from '../db';
import { eq, and, gte, count } from 'drizzle-orm';

export const QUOTA_LIMITS = {
  guest: 3,
  basic: 50,
  premium: 200,
  admin: 999999,
} as const;

export async function checkQuota(userId: string, subscriptionTier: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const limit = QUOTA_LIMITS[subscriptionTier as keyof typeof QUOTA_LIMITS] || 0;
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  try {
    const used = await db
      .select({ count: count() })
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.userId, userId),
          gte(aiConversations.createdAt, startOfMonth)
        )
      );

    const usedCount = Number(used[0]?.count) || 0;
    
    return {
      allowed: usedCount < limit,
      used: usedCount,
      limit,
    };
  } catch (error) {
    console.error('Error checking quota:', error);
    return {
      allowed: true,
      used: 0,
      limit,
    };
  }
}
