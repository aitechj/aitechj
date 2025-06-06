import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '../../../../lib/auth/jwt';
import { generateAIResponse } from '../../../../lib/ai/openai';
import { checkQuota } from '../../../../lib/ai/quota';
import { getCachedResponse, setCachedResponse, generateCacheKey } from '../../../../lib/ai/cache';
import { isAIServiceEnabled } from '../../../../lib/ai/cost-monitor';
import { db, aiConversations } from '../../../../lib/db';
import { getOrCreateGuestUser, setGuestCookie } from '../../../../lib/auth/guest';


const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 2048);
};

const ChatInputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(2048),
  })).min(1).max(50),
  contextContent: z.string().max(5000).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let user;
    let response;
    
    try {
      user = await getCurrentUser();
      console.log('✅ Authenticated user found for chat:', user?.userId);
    } catch (err: any) {
      if (err.name === "UnauthorizedError") {
        console.log('🔍 No authenticated user, checking for guest token...');
        const existingGuestToken = request.cookies.get("guest_token")?.value;
        
        if (existingGuestToken) {
          const { validateGuestToken } = await import('@/lib/auth/guest');
          user = await validateGuestToken(existingGuestToken);
          
          if (!user) {
            console.log('❌ Invalid guest token, creating new guest user');
            const guestResult = await getOrCreateGuestUser(request);
            user = guestResult.user;
          } else {
            console.log('✅ Valid guest token found for chat:', user.userId);
          }
        } else {
          console.log('🆕 No guest token found, creating new guest user');
          const guestResult = await getOrCreateGuestUser(request);
          user = guestResult.user;
        }
      } else {
        console.error('❌ Authentication error in chat:', err);
        throw err;
      }
    }

    if (!user) {
      console.log('❌ No user found after all attempts in chat');
      return NextResponse.json(
        { error: 'Failed to authenticate or create guest user' },
        { status: 401 }
      );
    }

    const serviceEnabled = await isAIServiceEnabled();
    if (!serviceEnabled) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable due to cost limits. Please try again next month.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { messages, contextContent } = ChatInputSchema.parse(body);

    const sanitizedMessages = messages.map((msg: any) => ({
      ...msg,
      content: sanitizeInput(msg.content)
    }));
    const sanitizedContext = contextContent ? sanitizeInput(contextContent) : undefined;

    const { getMonthlyUsage } = await import('@/lib/ai/quota');
    const usageCount = await getMonthlyUsage(user.userId);
    const limit = user.subscriptionTier === "guest" ? 3 
                : user.subscriptionTier === "basic" ? 50 
                : user.subscriptionTier === "premium" ? 200
                : Infinity;
    
    console.log('🔍 Quota check before OpenAI:', { userId: user.userId, used: usageCount, limit });
    
    if (usageCount >= limit) {
      console.log('❌ Quota exceeded, blocking request');
      return NextResponse.json(
        { error: 'Monthly quota exceeded. Please upgrade your plan for more questions.' },
        { status: 429 }
      );
    }

    const cacheKey = generateCacheKey(sanitizedMessages, sanitizedContext);
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      try {
        const cachedConversationResult = await db.insert(aiConversations).values({
          userId: user.userId,
          conversationId: `conv_cached_${Date.now()}_${user.userId}`,
          messages: [...sanitizedMessages, { role: 'assistant', content: cachedResponse.content }],
          tokensUsed: cachedResponse.tokensUsed || 0,
          createdAt: new Date(),
        }).returning({ id: aiConversations.id });
        
        console.log('✅ Cached conversation logged for user:', user.userId, 'conversation ID:', cachedConversationResult[0]?.id);
      } catch (dbError) {
        console.error('❌ Failed to insert cached conversation:', dbError);
        console.error('❌ Cached database error details:', JSON.stringify(dbError, null, 2));
      }

      return NextResponse.json({ 
        ...cachedResponse, 
        cached: true,
        quota: usageCount + 1
      });
    }

    const aiResponse = await generateAIResponse(sanitizedMessages, user.subscriptionTier, sanitizedContext);

    try {
      const conversationResult = await db.insert(aiConversations).values({
        userId: user.userId,
        conversationId: `conv_${Date.now()}_${user.userId}`,
        messages: [...sanitizedMessages, { role: 'assistant', content: aiResponse.content }],
        tokensUsed: aiResponse.tokensUsed,
        createdAt: new Date(),
      }).returning({ id: aiConversations.id });
      
      console.log('✅ Conversation logged for user:', user.userId, 'conversation ID:', conversationResult[0]?.id);
    } catch (dbError) {
      console.error('❌ Failed to insert conversation:', dbError);
      console.error('❌ Database error details:', JSON.stringify(dbError, null, 2));
    }

    await setCachedResponse(cacheKey, aiResponse);

    const updatedQuota = await checkQuota(user.userId, user.subscriptionTier);
    
    return NextResponse.json({ 
      ...aiResponse, 
      cached: false,
      quota: updatedQuota
    });

  } catch (error) {
    console.error('❌ AI chat error:', error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Error stack:', errorStack);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
