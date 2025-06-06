import { db, aiConversations } from '../db';
import { eq, and, gte } from 'drizzle-orm';

export const QUOTA_LIMITS = {
  guest: 3,
  basic: 50,
  premium: 200,
  admin: 999999,
} as const;

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const firstOfMonth = startOfCurrentMonth();
  console.log('Checking quota for user:', userId, 'since:', firstOfMonth);
  
  const conversations = await db
    .select()
    .from(aiConversations)
    .where(and(
      eq(aiConversations.userId, userId),
      gte(aiConversations.createdAt, firstOfMonth)
    ));
  
  console.log('Found conversations:', conversations.length);
  return conversations.length;
}

export async function checkQuota(userId: string, subscriptionTier: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const limit = QUOTA_LIMITS[subscriptionTier as keyof typeof QUOTA_LIMITS] || 0;
  const used = await getMonthlyUsage(userId);
  
  return {
    allowed: used < limit,
    used,
    limit,
  };
}
