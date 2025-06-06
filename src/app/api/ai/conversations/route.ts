import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth/jwt';
import { db, aiConversations } from '../../../../lib/db';
import { eq, desc } from 'drizzle-orm';
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

    if (!user) {
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

    const response = NextResponse.json({ conversations });

    if (guestToken && isNewGuest) {
      setGuestCookie(response, guestToken);
    }

    return response;

  } catch (error) {
    console.error('Conversations fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
