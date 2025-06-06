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

export async function getOrCreateGuestUser(request: NextRequest): Promise<{
  user: GuestUser;
  token: string;
  isNewGuest: boolean;
}> {
  const existingGuestToken = request.cookies.get('guest_token')?.value;
  
  if (existingGuestToken) {
    try {
      const decoded = await validateGuestToken(existingGuestToken);
      
      if (decoded) {
        return {
          user: decoded,
          token: existingGuestToken,
          isNewGuest: false,
        };
      }
    } catch (error) {
    }
  }
  
  const guestId = generateGuestId();
  const token = createGuestJWT(guestId);
  
  try {
    console.log('Creating guest user in database:', guestId);
    await db.insert(users).values({
      id: guestId,
      email: `guest_${guestId}@aitechj.local`,
      passwordHash: null,
      subscriptionTier: 'guest',
      emailVerified: false,
      isActive: true,
    });
    
    console.log('✅ Guest user created successfully:', guestId);
  } catch (error) {
    console.error('❌ Failed to create guest user in database:', error);
    if (error instanceof Error && (error.message.includes('duplicate key') || error.message.includes('unique constraint'))) {
      console.log('Guest user already exists, continuing...');
    } else {
      throw new Error('Failed to create guest session');
    }
  }
  
  const user: GuestUser = {
    userId: guestId,
    email: `guest_${guestId}@aitechj.local`,
    role: 'guest',
    subscriptionTier: 'guest',
    isGuest: true,
  };
  
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
