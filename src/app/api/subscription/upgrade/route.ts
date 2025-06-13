import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tier } = await request.json();
    
    if (!['basic', 'premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    await db
      .update(users)
      .set({
        subscriptionTier: tier,
        periodStart: periodStart,
        queriesUsed: 0,
        updatedAt: now
      })
      .where(eq(users.id, user.userId));

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${tier} plan`,
      tier,
      periodStart: periodStart.toISOString()
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
