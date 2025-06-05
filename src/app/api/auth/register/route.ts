import { NextRequest, NextResponse } from 'next/server';
import { db, users, userRoles } from '../../../../lib/db';
import { hashPassword, validatePassword } from '../../../../lib/auth/password';
import { signJWT, type CustomJWTPayload } from '../../../../lib/auth/jwt';
import { generateRefreshToken, storeRefreshToken } from '../../../../lib/auth/refresh-tokens';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = registerSchema.parse(body);

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
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        roleId: guestRole[0].id,
        subscriptionTier: 'guest',
        emailVerified: false,
        isActive: true,
      })
      .returning();

    const jwtPayload: CustomJWTPayload = {
      userId: newUser[0].id,
      email: newUser[0].email,
      role: 'guest',
      subscriptionTier: 'guest',
    };

    const accessToken = await signJWT(jwtPayload, '15m');
    const refreshToken = await generateRefreshToken();
    await storeRefreshToken(newUser[0].id, refreshToken);

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          role: 'guest',
          subscriptionTier: 'guest',
          emailVerified: false,
        },
      },
      { status: 201 }
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
    console.error('Registration error:', error);
    
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
