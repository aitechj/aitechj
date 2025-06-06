import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth/jwt';
import { checkMonthlyCost } from '../../../../lib/ai/cost-monitor';
import { getOrCreateGuestUser, setGuestCookie } from '../../../../lib/auth/guest';

export async function GET(request: NextRequest) {
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

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const costData = await checkMonthlyCost();
    
    const response = NextResponse.json({
      ...costData,
      costPerToken: 0.00005,
      emergencyThreshold: 1000,
      warningThreshold: 500,
    });

    if (guestToken && isNewGuest) {
      setGuestCookie(response, guestToken);
    }

    return response;

  } catch (error) {
    console.error('Cost monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
