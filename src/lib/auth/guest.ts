import { NextRequest, NextResponse } from 'next/server';
import { signJWT, verifyJWT, JWTPayload } from './jwt';
import crypto from 'crypto';

export interface GuestUser extends JWTPayload {
  isGuest: boolean;
}

export function generateGuestId(): string {
  return `guest_${crypto.randomUUID()}`;
}

export function createGuestJWT(guestId: string): string {
  const guestPayload = {
    userId: guestId,
    email: `${guestId}@guest.local`,
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
    const { db, users } = await import('../db');
    await db.insert(users).values({
      id: guestId,
      email: `${guestId}@guest.local`,
      passwordHash: 'guest_user_no_password',
      subscriptionTier: 'guest',
      emailVerified: false,
      isActive: true,
    }).onConflictDoNothing();
  } catch (error) {
    console.error('Failed to create guest user in database:', error);
  }
  
  const user: GuestUser = {
    userId: guestId,
    email: `${guestId}@guest.local`,
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
