import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { getMonthlyUsage } from '@/lib/ai/quota';
import { getOrCreateGuestUser, setGuestCookie, validateGuestToken } from '@/lib/auth/guest';
import { eq } from 'drizzle-orm';

function firstOfNextMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let user;
    let guestToken = null;
    let isNewGuest = false;
    
    try {
      user = await getCurrentUser();
    } catch (err: any) {
      if (err.name === "UnauthorizedError") {
        const existingGuestToken = request.cookies.get("guest_token")?.value;
        if (existingGuestToken) {
          user = await validateGuestToken(existingGuestToken);
          if (!user) {
            console.log('❌ Invalid guest token, creating new guest user');
            const guestResult = await getOrCreateGuestUser(request);
            user = guestResult.user;
            guestToken = guestResult.token;
            isNewGuest = guestResult.isNewGuest;
          } else {
            console.log('✅ Valid guest token found for user:', user.userId);
            
            const { db, users } = await import('@/lib/db');
            const existingUser = await db.select().from(users).where(eq(users.id, user.userId)).limit(1);
            
            if (existingUser.length === 0) {
              console.log('❌ Guest user not found in database, creating new one');
              const guestResult = await getOrCreateGuestUser(request);
              user = guestResult.user;
              guestToken = guestResult.token;
              isNewGuest = guestResult.isNewGuest;
            }
          }
        } else {
          console.log('🆕 No guest token found, creating new guest user');
          const guestResult = await getOrCreateGuestUser(request);
          user = guestResult.user;
          guestToken = guestResult.token;
          isNewGuest = guestResult.isNewGuest;
        }
      } else {
        throw err;
      }
    }

    if (!user) {
      console.log('🆕 No user found, creating guest user');
      const guestResult = await getOrCreateGuestUser(request);
      user = guestResult.user;
      guestToken = guestResult.token;
      isNewGuest = guestResult.isNewGuest;
    }

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

    if (guestToken && isNewGuest) {
      setGuestCookie(response, guestToken);
    }

    return response;

  } catch (error) {
    console.error('Quota check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
