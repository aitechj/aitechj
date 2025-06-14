import { NextRequest, NextResponse } from 'next/server';
import { db, users, userRoles } from '../../../../lib/db';
import { hashPassword, validatePassword } from '../../../../lib/auth/password';
import { signJWT, type CustomJWTPayload } from '../../../../lib/auth/jwt';
import { generateRefreshToken, storeRefreshToken } from '../../../../lib/auth/refresh-tokens';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  console.log('🔍 Registration API called in production');
  try {
    const body = await request.json();
    console.log('📝 Parsed body:', { name: body.name, email: body.email, hasPassword: !!body.password });
    const { name, email, password } = registerSchema.parse(body);
    console.log('✅ Schema validation passed for email:', email);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password validation failed', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    const guestRole = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.name, 'guest'))
      .limit(1);

    if (guestRole.length === 0) {
      return NextResponse.json(
        { error: 'Default role not found. Please contact support.' },
        { status: 500 }
      );
    }

    const passwordHash = await hashPassword(password);
    console.log('🔍 About to insert new user:', { name, email, roleId: guestRole[0].id });
    console.log('🔍 Guest role found:', { id: guestRole[0].id, name: guestRole[0].name });
    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        roleId: guestRole[0].id,
        subscriptionTier: 'free',
        periodStart: new Date(),
        queriesUsed: 0,
        emailVerified: false,
        isActive: true,
      })
      .returning();
    console.log('✅ User insertion completed:', { userId: newUser[0].id, name: newUser[0].name });

    const jwtPayload: CustomJWTPayload = {
      userId: newUser[0].id,
      name: newUser[0].name,
      email: newUser[0].email,
      role: 'guest',
      subscriptionTier: 'free',
    };

    console.log('🔐 Creating tokens for user:', newUser[0].id);
    const accessToken = await signJWT(jwtPayload, '15m');
    const refreshToken = await generateRefreshToken();
    await storeRefreshToken(newUser[0].id, refreshToken);
    console.log('✅ Tokens created and stored successfully');

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: newUser[0].id,
          name: newUser[0].name,
          email: newUser[0].email,
          role: 'guest',
          subscriptionTier: 'free',
          emailVerified: false,
        },
      },
      { status: 201 }
    );

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
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes, same as access token
    });

    console.log('✅ Registration successful, returning response');
    return response;
  } catch (error) {
    console.error('🔥 Registration failed with error:', error);
    console.error('🔥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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
