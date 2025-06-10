import { db, aiConversations } from '../db';
import { eq, and, gte, sql } from 'drizzle-orm';

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
  const limit = QUOTA_LIMITS[subscriptionTier as keyof typeof QUOTA_LIMITS] || 0;
  const firstOfMonth = startOfCurrentMonth();
  
  try {
    return await db.transaction(async (tx: any) => {
      await tx.execute(sql`LOCK TABLE ai_conversations IN SHARE ROW EXCLUSIVE MODE`);
      
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
  const limit = QUOTA_LIMITS[subscriptionTier as keyof typeof QUOTA_LIMITS] || 0;
  
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
