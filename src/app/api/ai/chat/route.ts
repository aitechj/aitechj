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

export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    let guestToken = null;
    let isNewGuest = false;
    
    if (!user) {
      const guestResult = await getOrCreateGuestUser(request);
      user = guestResult.user;
      guestToken = guestResult.token;
      isNewGuest = guestResult.isNewGuest;
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

    const quotaCheck = await checkQuota(user!.userId, user!.subscriptionTier);
    if (!quotaCheck.allowed) {
      const response = NextResponse.json(
        { 
          error: 'Monthly quota exceeded. Please upgrade your plan for more questions.', 
          quota: quotaCheck 
        },
        { status: 429 }
      );

      if (guestToken && isNewGuest) {
        setGuestCookie(response, guestToken);
      }

      return response;
    }

    const cacheKey = generateCacheKey(sanitizedMessages, sanitizedContext);
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      const response = NextResponse.json({ 
        ...cachedResponse, 
        cached: true,
        quota: quotaCheck
      });

      if (guestToken && isNewGuest) {
        setGuestCookie(response, guestToken);
      }

      return response;
    }

    const aiResponse = await generateAIResponse(sanitizedMessages, user!.subscriptionTier, sanitizedContext);

    try {
      await db.insert(aiConversations).values({
        userId: user!.userId,
        conversationId: `conv_${Date.now()}`,
        messages: [...sanitizedMessages, { role: 'assistant', content: aiResponse.content }],
        tokensUsed: aiResponse.tokensUsed,
      });
    } catch (dbError) {
      console.error('Failed to insert conversation:', dbError);
    }

    await setCachedResponse(cacheKey, aiResponse);

    const updatedQuota = await checkQuota(user!.userId, user!.subscriptionTier);
    
    const response = NextResponse.json({ 
      ...aiResponse, 
      cached: false,
      quota: updatedQuota
    });

    if (guestToken && isNewGuest) {
      setGuestCookie(response, guestToken);
    }

    return response;

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
