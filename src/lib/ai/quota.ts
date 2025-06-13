import { db, aiConversations, users } from '../db';
import { eq, and, gte, sql } from 'drizzle-orm';
import { QUOTA_CONFIG, type SubscriptionTier, getQuotaLimit } from './quota-config';

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const userRecord = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRecord.length === 0) {
    return 0;
  }

  return userRecord[0].queriesUsed || 0;
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
  
  try {
    return await db.transaction(async (tx: any) => {
      const lockId = hashUserId(userId);
      console.log('🔒 Acquiring advisory lock for user', { userId, lockId });
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);
      
      const userRecord = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userRecord.length === 0) {
        return {
          success: false,
          quotaExceeded: false,
          used: 0,
          limit
        };
      }

      const userData = userRecord[0];
      const now = new Date();
      let currentQueriesUsed = userData.queriesUsed || 0;
      
      if (subscriptionTier === 'free') {
        const periodStart = userData.periodStart || userData.createdAt || now;
        const daysSinceStart = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceStart >= 30) {
          await tx
            .update(users)
            .set({
              periodStart: now,
              queriesUsed: 0,
              updatedAt: now
            })
            .where(eq(users.id, userId));
          currentQueriesUsed = 0;
        }
      } else {
        const periodStart = userData.periodStart || userData.createdAt || now;
        const currentMonth = now.getMonth();
        const periodMonth = periodStart.getMonth();
        
        if (currentMonth !== periodMonth) {
          const newPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          await tx
            .update(users)
            .set({
              periodStart: newPeriodStart,
              queriesUsed: 0,
              updatedAt: now
            })
            .where(eq(users.id, userId));
          currentQueriesUsed = 0;
        }
      }

      if (currentQueriesUsed >= limit) {
        console.log('❌ Quota exceeded during atomic check:', { userId, used: currentQueriesUsed, limit });
        return {
          success: false,
          quotaExceeded: true,
          used: currentQueriesUsed,
          limit
        };
      }

      await tx
        .update(users)
        .set({
          queriesUsed: currentQueriesUsed + 1,
          updatedAt: now
        })
        .where(eq(users.id, userId));
      
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
        used: currentQueriesUsed + 1,
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
  const userRecord = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRecord.length === 0) {
    return {
      allowed: false,
      used: 0,
      limit: getQuotaLimit(subscriptionTier)
    };
  }

  const userData = userRecord[0];
  const now = new Date();
  let currentQueriesUsed = userData.queriesUsed || 0;
  
  if (subscriptionTier === 'free') {
    const periodStart = userData.periodStart || userData.createdAt || now;
    const daysSinceStart = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceStart >= 30) {
      await db
        .update(users)
        .set({
          periodStart: now,
          queriesUsed: 0,
          updatedAt: now
        })
        .where(eq(users.id, userId));
      currentQueriesUsed = 0;
    }
  } else {
    const periodStart = userData.periodStart || userData.createdAt || now;
    const currentMonth = now.getMonth();
    const periodMonth = periodStart.getMonth();
    
    if (currentMonth !== periodMonth) {
      const newPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      await db
        .update(users)
        .set({
          periodStart: newPeriodStart,
          queriesUsed: 0,
          updatedAt: now
        })
        .where(eq(users.id, userId));
      currentQueriesUsed = 0;
    }
  }

  const limit = getQuotaLimit(subscriptionTier);
  
  console.log(`🔍 Quota check for user ${userId}: ${currentQueriesUsed}/${limit} (tier: ${subscriptionTier})`);
  
  return {
    allowed: currentQueriesUsed < limit,
    used: currentQueriesUsed,
    limit,
  };
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
