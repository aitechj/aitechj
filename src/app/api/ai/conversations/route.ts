import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth/jwt';
import { db, aiConversations } from '../../../../lib/db';
import { eq, desc } from 'drizzle-orm';
import { getOrCreateGuestUser, setGuestCookie } from '../../../../lib/auth/guest';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let user;
    let guestResult;
    
    try {
      user = await getCurrentUser(request);
      console.log('✅ Authenticated user found for conversations:', user?.userId);
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
            console.log('✅ Valid guest token found for conversations:', user.userId);
          }
        } else {
          console.log('🆕 No guest token found, creating new guest user');
          guestResult = await getOrCreateGuestUser(request);
          user = guestResult.user;
        }
      } else {
        console.error('❌ Authentication error in conversations:', err);
        throw err;
      }
    }

    if (!user) {
      console.log('❌ No user found after all attempts in conversations');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conversations = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, user.userId))
      .orderBy(desc(aiConversations.createdAt))
      .limit(limit)
      .offset(offset);

    console.log('📋 Found conversations for user:', user.userId, 'count:', conversations.length);

    const responseData: any = { conversations };
    
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
    console.error('❌ Conversations fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Error stack:', errorStack);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
