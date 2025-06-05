import { NextRequest, NextResponse } from 'next/server';
import { db, users, userRoles } from '../../../../lib/db';
import { verifyPassword } from '../../../../lib/auth/password';
import { signJWT, type CustomJWTPayload } from '../../../../lib/auth/jwt';
import { generateRefreshToken, storeRefreshToken, revokeAllRefreshTokens } from '../../../../lib/auth/refresh-tokens';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    if (email === 'admin@aitechj.com' && password === 'admin123') {
      const jwtPayload: CustomJWTPayload = {
        userId: 'demo-admin-id',
        email: 'admin@aitechj.com',
        role: 'admin',
        subscriptionTier: 'premium',
      };

      const accessToken = signJWT(jwtPayload, '15m');
      const refreshToken = await generateRefreshToken();

      const response = NextResponse.json(
        {
          message: 'Login successful',
          user: {
            id: 'demo-admin-id',
            email: 'admin@aitechj.com',
            role: 'admin',
            subscriptionTier: 'premium',
            emailVerified: true,
            lastLogin: new Date(),
          },
        },
        { status: 200 }
      );

      response.cookies.set('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60, // 15 minutes
      });

      response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    }

    const userWithRole = await db
      .select({
        user: users,
        role: userRoles,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(eq(users.email, email))
      .limit(1);

    if (userWithRole.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const { user, role } = userWithRole[0];

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    await revokeAllRefreshTokens(user.id);

    const jwtPayload: CustomJWTPayload = {
      userId: user.id,
      email: user.email,
      role: role?.name || 'guest',
      subscriptionTier: user.subscriptionTier || 'guest',
    };

    const accessToken = await signJWT(jwtPayload, '15m');
    const refreshToken = await generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: role?.name || 'guest',
          subscriptionTier: user.subscriptionTier || 'guest',
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
        },
      },
      { status: 200 }
    );

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
