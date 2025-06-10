import { NextRequest, NextResponse } from 'next/server';
import { signJWT, verifyJWT, JWTPayload } from './jwt';
import { db, users } from '../db';
import crypto from 'crypto';

export interface GuestUser extends JWTPayload {
  isGuest: boolean;
}

export function generateGuestId(): string {
  return crypto.randomUUID();
}

export function createGuestJWT(guestId: string): string {
  const guestPayload = {
    userId: guestId,
    email: `guest_${guestId}@aitechj.local`,
    role: 'guest',
    subscriptionTier: 'guest',
  };
  
  return signJWT(guestPayload, '30d');
}

export async function validateGuestToken(token: string): Promise<GuestUser | null> {
  try {
    const decoded = await verifyJWT(token);
    if (!decoded || decoded.subscriptionTier !== 'guest') {
      return null;
    }
    
    return {
      ...decoded,
      isGuest: true,
    } as GuestUser;
  } catch (error) {
    return null;
  }
}

export async function getOrCreateGuestUser(request: NextRequest, threadId?: string): Promise<{
  user: GuestUser;
  token: string;
  isNewGuest: boolean;
}> {
  console.log('🔍 getOrCreateGuestUser called');
  let existingGuestToken = request.cookies.get('guest_token')?.value;
  
  if (!existingGuestToken) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      existingGuestToken = authHeader.substring(7);
      console.log('🔑 Using guest token from Authorization header');
    }
  }
  console.log('🍪 Existing guest token:', existingGuestToken ? 'found' : 'not found');
  
  if (existingGuestToken) {
    try {
      console.log('🔐 Validating existing guest token...');
      const decoded = await validateGuestToken(existingGuestToken);
      
      if (decoded) {
        console.log('✅ Existing guest token valid, checking database for user:', decoded.userId);
        
        try {
          const { db, users } = await import('../db');
          const { eq } = await import('drizzle-orm');
          const existingUser = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
          
          if (existingUser.length > 0) {
            console.log('✅ Guest user found in database, returning existing user:', decoded.userId);
            return {
              user: decoded,
              token: existingGuestToken,
              isNewGuest: false,
            };
          } else {
            console.log('❌ Guest user not found in database, will create new user');
          }
        } catch (dbError) {
          console.log('⚠️ Database check failed, but token is valid, continuing with existing user:', dbError);
          return {
            user: decoded,
            token: existingGuestToken,
            isNewGuest: false,
          };
        }
      }
      console.log('❌ Existing guest token invalid');
    } catch (error) {
      console.log('❌ Error validating guest token:', error);
    }
  }
  
  const guestId = generateGuestId();
  const token = createGuestJWT(guestId);
  console.log('🆕 Creating new guest user with ID:', guestId);
  
  try {
    console.log('💾 Inserting guest user into database...');
    const { db, users } = await import('../db');
    
    console.log('Creating guest user in database:', guestId);
    
    try {
      const result = await db.insert(users).values({
        id: guestId,
        email: `${guestId}@guest.local`,
        passwordHash: 'guest_user_no_password',
        subscriptionTier: 'guest',
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
      }).onConflictDoNothing().returning({ id: users.id });
      
      console.log('✅ Guest user created successfully:', guestId, 'result:', result);
    } catch (dbError) {
      console.log('⚠️ Database insert failed, but continuing:', dbError);
    }
  } catch (error) {
    console.error('❌ [Production Guest Creation Error]', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    console.log('⚠️ Database connection failed, but continuing with guest session');
  }
  
  const user: GuestUser = {
    userId: guestId,
    email: `guest_${guestId}@aitechj.local`,
    role: 'guest',
    subscriptionTier: 'guest',
    isGuest: true,
  };
  
  console.log('🎯 Returning new guest user:', user.userId);
  return {
    user,
    token,
    isNewGuest: true,
  };
}

export function setGuestCookie(response: NextResponse, token: string): void {
  response.cookies.set('guest_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
}
