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
    console.log('🔍 Found user:', { id: user.id, email: user.email, isActive: user.isActive, hasPasswordHash: !!user.passwordHash });

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    console.log('🔐 Verifying password for user:', user.email);
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    console.log('🔐 Password verification result:', isPasswordValid);
    
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

    const accessToken = signJWT(jwtPayload, '15m');
    console.log('🔑 Generated JWT token:', !!accessToken);
    
    if (!accessToken) {
      throw new Error('Failed to generate JWT token');
    }
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

    const isPreview = process.env.VERCEL_ENV === 'preview';
    console.log('🍪 Setting cookies with config:', {
      secure: true,
      sameSite: isPreview ? 'none' : 'lax',
      path: '/',
      httpOnly: !isPreview, // Use localStorage for preview, HTTP-only for production
      isPreview
    });

    if (isPreview) {
      const clientTokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Date.now() + (15 * 60 * 1000) // 15 minutes from now
      };
      
      const previewResponse = NextResponse.json(
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
          tokens: clientTokens, // Include tokens for preview deployment
          isPreview: true
        },
        { status: 200 }
      );
      
      console.log('🍪 Preview mode: sending tokens in response body for client-side storage');
      return previewResponse;
    } else {
      response.cookies.set('access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax', // Lax is fine for same-origin production domains
        path: '/',
        maxAge: 15 * 60, // 15 minutes
      });

      response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax', // Lax is fine for same-origin production domains
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    console.log('🍪 Cookies set successfully in response');

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
