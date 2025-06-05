import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface CustomJWTPayload extends JoseJWTPayload {
  userId: string;
  email: string;
  role: string;
  subscriptionTier: string;
}

export async function signJWT(payload: CustomJWTPayload, expiresIn: string = '15m') {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyJWT(token: string): Promise<CustomJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as CustomJWTPayload;
  } catch (error) {
    return null;
  }
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token');
  return token?.value || null;
}

export async function getCurrentUser(): Promise<CustomJWTPayload | null> {
  const token = await getTokenFromCookies();
  if (!token) return null;
  return await verifyJWT(token);
}
