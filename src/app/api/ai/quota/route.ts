import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { getMonthlyUsage } from '@/lib/ai/quota';
import { getOrCreateGuestUser, validateGuestToken } from '@/lib/auth/guest';
import { eq } from 'drizzle-orm';

function firstOfNextMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting quota check...');
    
    const threadId = request.headers.get('X-Thread-ID');
    let user;
    let guestResult;
    
    if (threadId) {
      console.log('🔍 Found threadId in header, using for session persistence:', threadId);
      const existingGuestToken = request.cookies.get("guest_token")?.value;
      if (existingGuestToken) {
        user = await validateGuestToken(existingGuestToken);
        if (user && user.userId === threadId) {
          console.log('✅ Valid guest token matches threadId:', user.userId);
        } else {
          console.log('⚠️ Guest token does not match threadId, creating new session');
          guestResult = await getOrCreateGuestUser(request, threadId || undefined);
          user = guestResult.user;
        }
      } else {
        console.log('⚠️ No guest token found with threadId, creating new session');
        guestResult = await getOrCreateGuestUser(request, threadId || undefined);
        user = guestResult.user;
      }
    } else {
      console.log('🔍 No threadId in header, using standard guest user flow');
      guestResult = await getOrCreateGuestUser(request, threadId || undefined);
      user = guestResult.user;
    }
    
    console.log('✅ Guest user obtained:', user.userId);
    
    const usageCount = await getMonthlyUsage(user.userId);
    const { getQuotaLimit } = await import('@/lib/ai/quota-config');
    const limit = getQuotaLimit(user.subscriptionTier);
    
    console.log('📊 Quota check result:', { userId: user.userId, used: usageCount, limit });
    
    const responseData: any = {
      used: usageCount,
      quota: limit,
      resetDate: firstOfNextMonth().toISOString()
    };
    
    if (guestResult && guestResult.isNewGuest) {
      responseData.guestToken = guestResult.token;
    }
    
    const response = NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
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
    console.error('❌ Quota check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Error stack:', errorStack);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
