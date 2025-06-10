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
    
    const guestResult = await getOrCreateGuestUser(request);
    const user = guestResult.user;
    
    console.log('✅ Guest user obtained:', user.userId);
    
    const usageCount = await getMonthlyUsage(user.userId);
    const limit = user.subscriptionTier === "guest" ? 3
                : user.subscriptionTier === "basic" ? 50
                : user.subscriptionTier === "premium" ? 200
                : Infinity;
    
    console.log('📊 Quota check result:', { userId: user.userId, used: usageCount, limit });
    
    const response = NextResponse.json({
      used: usageCount,
      quota: limit,
      resetDate: firstOfNextMonth().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (guestResult.isNewGuest) {
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
