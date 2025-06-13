import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { getOrCreateGuestUser, validateGuestToken } from '@/lib/auth/guest';
import { db, users, topics, userProgress } from '@/lib/db';
import { eq, count, avg } from 'drizzle-orm';

function getQuotaLimit(tier: string): number {
  const limits = { free: 3, basic: 50, premium: 200 };
  return limits[tier as keyof typeof limits] || 3;
}

function calculatePeriodEnd(tier: string, periodStart: Date): Date {
  if (tier === 'free') {
    const endDate = new Date(periodStart);
    endDate.setDate(endDate.getDate() + 30);
    return endDate;
  } else {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let user;
    let guestResult;
    
    try {
      user = await getCurrentUser(request);
    } catch (error) {
      const existingGuestToken = request.cookies.get("guest_token")?.value;
      if (existingGuestToken) {
        user = await validateGuestToken(existingGuestToken);
        if (!user) {
          guestResult = await getOrCreateGuestUser(request);
          user = guestResult.user;
        }
      } else {
        guestResult = await getOrCreateGuestUser(request);
        user = guestResult.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (userRecord.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userRecord[0];
    const subscriptionTier = userData.subscriptionTier || 'free';
    const queriesUsed = userData.queriesUsed || 0;
    const queriesLimit = getQuotaLimit(subscriptionTier);
    const periodStart = userData.periodStart || userData.createdAt || new Date();
    const periodEnd = calculatePeriodEnd(subscriptionTier, periodStart);

    const [topicsResult, progressResult] = await Promise.all([
      db.select({ count: count() }).from(topics),
      db
        .select({ avgScore: avg(userProgress.score) })
        .from(userProgress)
        .where(eq(userProgress.userId, user.userId))
    ]);

    const topicsCount = topicsResult[0]?.count || 0;
    const avgScore = progressResult[0]?.avgScore || 0;
    const progressPercentage = Math.round(Number(avgScore) || 0);

    const responseData = {
      queriesUsed,
      queriesLimit,
      subscriptionTier,
      topicsCount,
      progressPercentage,
      periodEnd: periodEnd.toISOString()
    };

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
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
