import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '../../../../lib/auth/jwt';
import { generateAIResponse, ChatMessageSchema } from '../../../../lib/ai/openai';
import { sanitizeInput, ChatInputSchema } from '../../../../lib/ai/validation';
import { checkQuota } from '../../../../lib/ai/quota';
import { getCachedResponse, setCachedResponse, generateCacheKey } from '../../../../lib/ai/cache';
import { checkRateLimit } from '../../../../lib/ai/rate-limit';
import { isAIServiceEnabled } from '../../../../lib/ai/cost-monitor';
import { db, aiConversations } from '../../../../lib/db';



export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const rateLimit = await checkRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before sending another message.',
          rateLimit 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          }
        }
      );
    }

    const quotaCheck = await checkQuota(user.userId, user.subscriptionTier);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Monthly quota exceeded. Please upgrade your plan for more questions.', 
          quota: quotaCheck 
        },
        { status: 429 }
      );
    }

    const cacheKey = generateCacheKey(sanitizedMessages, sanitizedContext);
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      return NextResponse.json({ 
        ...cachedResponse, 
        cached: true,
        quota: quotaCheck,
        rateLimit 
      });
    }

    const aiResponse = await generateAIResponse(sanitizedMessages, user.subscriptionTier, sanitizedContext);

    await db.insert(aiConversations).values({
      userId: user.userId,
      conversationId: `conv_${Date.now()}`,
      messages: [...sanitizedMessages, { role: 'assistant', content: aiResponse.content }],
      tokensUsed: aiResponse.tokensUsed,
    });

    await setCachedResponse(cacheKey, aiResponse);

    const updatedQuota = await checkQuota(user.userId, user.subscriptionTier);
    
    return NextResponse.json({ 
      ...aiResponse, 
      cached: false,
      quota: updatedQuota,
      rateLimit 
    });

  } catch (error) {
    console.error('AI chat error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
