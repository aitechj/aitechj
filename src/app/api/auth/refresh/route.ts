import { NextRequest, NextResponse } from 'next/server';
import { db, users, userRoles } from '../../../../lib/db';
import { signJWT, type CustomJWTPayload } from '../../../../lib/auth/jwt';
import { verifyRefreshToken, generateRefreshToken, storeRefreshToken, revokeRefreshToken } from '../../../../lib/auth/refresh-tokens';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    
    const allUsers = await db.select().from(users);
    let validUser = null;

    for (const user of allUsers) {
      const isValid = await verifyRefreshToken(user.id, refreshToken);
      if (isValid) {
        validUser = user;
        break;
      }
    }

    if (!validUser) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    const userWithRole = await db
      .select({
        user: users,
        role: userRoles,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(eq(users.id, validUser.id))
      .limit(1);

    if (userWithRole.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { user, role } = userWithRole[0];

    await revokeRefreshToken(user.id, refreshToken);

    const jwtPayload: CustomJWTPayload = {
      userId: user.id,
      email: user.email,
      role: role?.name || 'guest',
      subscriptionTier: user.subscriptionTier || 'guest',
    };

    const newAccessToken = await signJWT(jwtPayload, '15m');
    const newRefreshToken = await generateRefreshToken();
    await storeRefreshToken(user.id, newRefreshToken);

    const response = NextResponse.json(
      {
        message: 'Tokens refreshed successfully',
        user: {
          id: user.id,
          email: user.email,
          role: role?.name || 'guest',
          subscriptionTier: user.subscriptionTier || 'guest',
        },
      },
      { status: 200 }
    );

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
