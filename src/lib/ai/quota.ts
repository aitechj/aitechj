import { db, aiConversations } from '../db';
import { eq, and, gte, sql } from 'drizzle-orm';
import { QUOTA_CONFIG, type SubscriptionTier, getQuotaLimit } from './quota-config';

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const firstOfMonth = startOfCurrentMonth();
  console.log('Checking quota for user:', userId, 'since:', firstOfMonth);
  
  try {
    const conversations = await db
      .select()
      .from(aiConversations)
      .where(and(
        eq(aiConversations.userId, userId),
        gte(aiConversations.createdAt, firstOfMonth)
      ));
    
    console.log('Found conversations:', conversations.length);
    return conversations.length;
  } catch (error) {
    console.error('❌ Failed to get monthly usage:', error);
    return 0;
  }
}

export async function atomicQuotaCheckAndInsert(
  userId: string,
  subscriptionTier: string,
  conversationData: {
    conversationId: string;
    messages: any;
    tokensUsed: number;
    createdAt: Date;
  }
): Promise<{
  success: boolean;
  quotaExceeded: boolean;
  used: number;
  limit: number;
  conversationId?: string;
}> {
  const limit = getQuotaLimit(subscriptionTier);
  const firstOfMonth = startOfCurrentMonth();
  
  try {
    return await db.transaction(async (tx: any) => {
      const lockId = hashUserId(userId);
      console.log('🔒 Acquiring advisory lock for user', { userId, lockId });
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);
      
      const currentUsage = await tx
        .select()
        .from(aiConversations)
        .where(and(
          eq(aiConversations.userId, userId),
          gte(aiConversations.createdAt, firstOfMonth)
        ));
      
      const used = currentUsage.length;
      
      if (used >= limit) {
        console.log('❌ Quota exceeded during atomic check:', { userId, used, limit });
        return {
          success: false,
          quotaExceeded: true,
          used,
          limit
        };
      }
      
      const insertResult = await tx.insert(aiConversations).values({
        userId,
        conversationId: conversationData.conversationId,
        messages: conversationData.messages,
        tokensUsed: conversationData.tokensUsed,
        createdAt: conversationData.createdAt,
      }).returning({ id: aiConversations.id });
      
      console.log('✅ Atomic conversation insert successful:', insertResult[0]?.id);
      
      return {
        success: true,
        quotaExceeded: false,
        used: used + 1,
        limit,
        conversationId: insertResult[0]?.id
      };
    });
  } catch (error) {
    console.error('❌ Atomic quota check and insert failed:', error);
    return {
      success: false,
      quotaExceeded: false,
      used: 0,
      limit
    };
  }
}

export async function checkQuota(userId: string, subscriptionTier: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const limit = getQuotaLimit(subscriptionTier);
  
  try {
    const used = await getMonthlyUsage(userId);
    return {
      allowed: used < limit,
      used,
      limit,
    };
  } catch (error) {
    console.error('❌ Failed to check quota:', error);
    return {
      allowed: true,
      used: 0,
      limit,
    };
  }
}

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
