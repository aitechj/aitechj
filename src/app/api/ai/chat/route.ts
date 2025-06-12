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
    let guestResult;
    
    try {
      console.log('🔍 Chat API: Attempting getCurrentUser...');
      console.log('🔍 Chat API: Request cookies available:', {
        access_token: !!request.cookies.get('access_token')?.value,
        guest_token: !!request.cookies.get('guest_token')?.value,
        auth_hint: !!request.cookies.get('auth_hint')?.value
      });
      user = await getCurrentUser(request);
      console.log('✅ Authenticated user found for chat:', user?.userId);
      console.log('🔍 Chat API user details:', { 
        userId: user?.userId, 
        role: user?.role, 
        subscriptionTier: user?.subscriptionTier 
      });
    } catch (err: any) {
      console.log('❌ Chat API getCurrentUser failed:', err.name, err.message);
      if (err.name === "UnauthorizedError") {
        console.log('🔍 No authenticated user, checking for guest token...');
        const existingGuestToken = request.cookies.get("guest_token")?.value;
        
        if (existingGuestToken) {
          const { validateGuestToken } = await import('@/lib/auth/guest');
          user = await validateGuestToken(existingGuestToken);
          
          if (!user) {
            console.log('❌ Invalid guest token, creating new guest user');
            guestResult = await getOrCreateGuestUser(request);
            user = guestResult.user;
          } else {
            console.log('✅ Valid guest token found for chat:', user.userId);
          }
        } else {
          console.log('🆕 No guest token found, creating new guest user');
          guestResult = await getOrCreateGuestUser(request);
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

    const cacheKey = generateCacheKey(sanitizedMessages, sanitizedContext);
    const cachedResponse = await getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      if (!user || !user.subscriptionTier) {
        console.warn('⚠️ Chat API: user or tier missing for cached response, treating as guest', user);
        user = { userId: 'guest', subscriptionTier: 'guest', role: 'guest' };
      }

      const { atomicQuotaCheckAndInsert } = await import('@/lib/ai/quota');
      console.log('🔍 Chat API calling atomicQuotaCheckAndInsert (cached) with:', { 
        userId: user.userId, 
        subscriptionTier: user.subscriptionTier 
      });
      const quotaResult = await atomicQuotaCheckAndInsert(
        user.userId,
        user.subscriptionTier,
        {
          conversationId: `conv_cached_${Date.now()}_${user.userId}`,
          messages: [...sanitizedMessages, { role: 'assistant', content: cachedResponse.content }],
          tokensUsed: cachedResponse.tokensUsed || 0,
          createdAt: new Date(),
        }
      );

      if (quotaResult.quotaExceeded) {
        console.log('❌ Quota exceeded for cached response');
        return NextResponse.json(
          { error: 'Monthly quota exceeded. Please upgrade your plan for more questions.' },
          { status: 429 }
        );
      }

      if (!quotaResult.success) {
        console.error('❌ Failed to insert cached conversation');
        return NextResponse.json({ 
          ...cachedResponse, 
          cached: true,
          error: 'Failed to save conversation'
        });
      }

      console.log('✅ Cached conversation logged for user:', user.userId, 'conversation ID:', quotaResult.conversationId);
      
      const responseData: any = { 
        ...cachedResponse, 
        cached: true,
        quota: quotaResult.used,
        threadId: user.userId
      };
      
      if (guestResult && guestResult.isNewGuest) {
        responseData.guestToken = guestResult.token;
      }
      
      const response = NextResponse.json(responseData);
      
      if (guestResult && guestResult.isNewGuest) {
        response.cookies.set('guest_token', guestResult.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }
      
      return response;
    }


    const aiResponse = await generateAIResponse(sanitizedMessages, user.subscriptionTier, sanitizedContext);

    if (!user || !user.subscriptionTier) {
      console.warn('⚠️ Chat API: user or tier missing, treating as guest', user);
      user = { userId: 'guest', subscriptionTier: 'guest', role: 'guest' };
    }

    const { atomicQuotaCheckAndInsert } = await import('@/lib/ai/quota');
    console.log('🔍 Chat API calling atomicQuotaCheckAndInsert (main) with:', { 
      userId: user.userId, 
      subscriptionTier: user.subscriptionTier 
    });
    const quotaResult = await atomicQuotaCheckAndInsert(
      user.userId,
      user.subscriptionTier,
      {
        conversationId: `conv_${Date.now()}_${user.userId}`,
        messages: [...sanitizedMessages, { role: 'assistant', content: aiResponse.content }],
        tokensUsed: aiResponse.tokensUsed,
        createdAt: new Date(),
      }
    );

    if (quotaResult.quotaExceeded) {
      console.log('❌ Quota exceeded after AI response generated');
      return NextResponse.json(
        { error: 'Monthly quota exceeded. Please upgrade your plan for more questions.' },
        { status: 429 }
      );
    }

    if (!quotaResult.success) {
      console.error('❌ Failed to insert conversation');
      await setCachedResponse(cacheKey, aiResponse);
      return NextResponse.json({ 
        ...aiResponse, 
        cached: false,
        error: 'Failed to save conversation'
      });
    }

    console.log('✅ Conversation logged for user:', user.userId, 'conversation ID:', quotaResult.conversationId);
    
    await setCachedResponse(cacheKey, aiResponse);
    
    const responseData: any = { 
      ...aiResponse, 
      cached: false,
      quota: quotaResult.used,
      threadId: user.userId
    };
    
    if (guestResult && guestResult.isNewGuest) {
      responseData.guestToken = guestResult.token;
    }
    
    const response = NextResponse.json(responseData);
    
    if (guestResult && guestResult.isNewGuest) {
      response.cookies.set('guest_token', guestResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
    }
    
    return response;

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
