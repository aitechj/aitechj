import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth/jwt';
import { checkMonthlyCost } from '../../../../lib/ai/cost-monitor';
import { getOrCreateGuestUser, setGuestCookie } from '../../../../lib/auth/guest';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let user;
    let guestResult;
    
    try {
      user = await getCurrentUser(request);
      console.log('✅ Authenticated user found for cost:', user?.userId);
    } catch (err: any) {
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
            console.log('✅ Valid guest token found for cost:', user.userId);
          }
        } else {
          console.log('🆕 No guest token found, creating new guest user');
          guestResult = await getOrCreateGuestUser(request);
          user = guestResult.user;
        }
      } else {
        console.error('❌ Authentication error in cost:', err);
        throw err;
      }
    }

    if (!user) {
      console.log('❌ No user found after all attempts in cost');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      const responseData: any = { 
        totalCost: 0,
        tokensUsed: 0,
        costPerToken: 0.00005,
        emergencyThreshold: 1000,
        warningThreshold: 500,
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

    const costData = await checkMonthlyCost();
    
    const responseData: any = {
      ...costData,
      costPerToken: 0.00005,
      emergencyThreshold: 1000,
      warningThreshold: 500,
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
    console.error('❌ Cost monitoring error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Error stack:', errorStack);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
