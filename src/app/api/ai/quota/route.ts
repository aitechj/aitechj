import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { checkQuota } from '@/lib/ai/quota';
import { getOrCreateGuestUser, setGuestCookie } from '@/lib/auth/guest';


export async function GET(request: NextRequest) {
  try {
    let user;
    let guestToken = null;
    let isNewGuest = false;
    
    user = await getCurrentUser();
    
    if (!user) {
      const guestResult = await getOrCreateGuestUser(request);
      user = guestResult.user;
      guestToken = guestResult.token;
      isNewGuest = guestResult.isNewGuest;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quotaStatus = await checkQuota(user.userId, user.subscriptionTier);
    
    const response = NextResponse.json({
      ...quotaStatus,
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
