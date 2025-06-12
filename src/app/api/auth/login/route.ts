import { NextRequest, NextResponse } from 'next/server';
import { db, users, userRoles } from '../../../../lib/db';
import { verifyPassword } from '../../../../lib/auth/password';
import { signJWT, type CustomJWTPayload } from '../../../../lib/auth/jwt';
import { generateRefreshToken, storeRefreshToken, revokeAllRefreshTokens } from '../../../../lib/auth/refresh-tokens';
import { shouldUseLocalStorage } from '../../../../lib/auth/environment';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  console.log('🔍 Login API called in production');
  try {
    const body = await request.json();
    console.log('📝 Parsed body:', { email: body.email, hasPassword: !!body.password });
    const { email, password } = loginSchema.parse(body);
    console.log('✅ Schema validation passed for email:', email);



    console.log('🔍 Looking up user for email:', email);
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
      console.log('❌ User not found for email:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const { user, role } = userWithRole[0];
    console.log('🔍 Found user:', { id: user.id, email: user.email, isActive: user.isActive, hasPasswordHash: !!user.passwordHash });

    if (!user.isActive) {
      console.log('❌ User account is inactive');
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    console.log('🔐 Verifying password for user:', user.email);
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    console.log('🔐 Password verification result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('🔄 Updating last login for user:', user.id);
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    console.log('🔄 Revoking old refresh tokens');
    await revokeAllRefreshTokens(user.id);

    const jwtPayload: CustomJWTPayload = {
      userId: user.id,
      email: user.email,
      role: role?.name || 'guest',
      subscriptionTier: user.subscriptionTier || 'guest',
    };

    console.log('🔐 Creating tokens for user:', user.id);
    const accessToken = await signJWT(jwtPayload, '15m');
    const refreshToken = await generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);
    console.log('✅ Tokens created and stored successfully');

    const responseData: any = {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: role?.name || 'guest',
        subscriptionTier: user.subscriptionTier || 'guest',
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
      },
    };
    
    if (shouldUseLocalStorage()) {
      responseData.tokens = {
        accessToken: accessToken,
        refreshToken: refreshToken,
      };
    }
    
    const response = NextResponse.json(responseData, { status: 200 });

    console.log('🍪 Setting access_token cookie');
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
    });

    console.log('🍪 Setting refresh_token cookie');
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

   console.log('🍪 Setting auth_hint cookie');
   response.cookies.set('auth_hint', 'true', {
     httpOnly: false, // ❗ this makes it readable by middleware
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     path: '/',
     maxAge: 15 * 60, // optional: match token expiry
    });

    console.log('✅ Login successful, returning response');
    return response;
  } catch (error) {
    console.error('🔥 Login failed with error:', error);
    console.error('🔥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof z.ZodError) {
      console.log('❌ Zod validation error:', error.errors);
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
