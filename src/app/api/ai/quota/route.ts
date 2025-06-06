import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { checkQuota } from '@/lib/ai/quota';
import { getOrCreateGuestUser, setGuestCookie } from '@/lib/auth/guest';


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
          const { validateGuestToken } = await import('@/lib/auth/guest');
          const guestUser = await validateGuestToken(existingGuestToken);
          if (guestUser) {
            user = guestUser;
          } else {
            const guestResult = await getOrCreateGuestUser(request);
            user = guestResult.user;
            guestToken = guestResult.token;
            isNewGuest = guestResult.isNewGuest;
          }
        } else {
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
      const guestResult = await getOrCreateGuestUser(request);
      user = guestResult.user;
      guestToken = guestResult.token;
      isNewGuest = guestResult.isNewGuest;
    }

    const quotaStatus = await checkQuota(user.userId, user.subscriptionTier);
    const limit = user.subscriptionTier === "guest" ? 3
               : user.subscriptionTier === "basic" ? 50
               : user.subscriptionTier === "premium" ? 200
               : Infinity; // admin or others
    
    const response = NextResponse.json({
      used: quotaStatus.used,
      limit: limit,
      allowed: quotaStatus.allowed,
      resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
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
