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
    let user;
    let response;
    
    try {
      user = await getCurrentUser();
      console.log('✅ Authenticated user found:', user?.userId);
    } catch (err: any) {
      if (err.name === "UnauthorizedError") {
        console.log('🔍 No authenticated user, checking for guest token...');
        const existingGuestToken = request.cookies.get("guest_token")?.value;
        
        if (existingGuestToken) {
          console.log('🍪 Found existing guest token, validating...');
          user = await validateGuestToken(existingGuestToken);
          
          if (!user) {
            console.log('❌ Invalid guest token, creating new guest user');
            const guestResult = await getOrCreateGuestUser(request);
            user = guestResult.user;
            
            response = NextResponse.json({
              used: 0,
              quota: 3,
              resetDate: firstOfNextMonth().toISOString()
            }, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            
            response.cookies.set('guest_token', guestResult.token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 30 * 24 * 60 * 60,
              path: '/',
            });
            
            return response;
          } else {
            console.log('✅ Valid guest token found for user:', user.userId);
          }
        } else {
          console.log('🆕 No guest token found, creating new guest user');
          const guestResult = await getOrCreateGuestUser(request);
          user = guestResult.user;
          
          response = NextResponse.json({
            used: 0,
            quota: 3,
            resetDate: firstOfNextMonth().toISOString()
          }, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          response.cookies.set('guest_token', guestResult.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
          });
          
          return response;
        }
      } else {
        console.error('❌ Authentication error:', err);
        throw err;
      }
    }

    if (!user) {
      console.log('❌ No user found after all attempts');
      return NextResponse.json(
        { error: 'Failed to authenticate or create guest user' },
        { status: 401 }
      );
    }

    const usageCount = await getMonthlyUsage(user.userId);
    const limit = user.subscriptionTier === "guest" ? 3
                : user.subscriptionTier === "basic" ? 50
                : user.subscriptionTier === "premium" ? 200
                : Infinity;
    
    console.log('📊 Quota check result:', { userId: user.userId, used: usageCount, limit });
    
    return NextResponse.json({
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
