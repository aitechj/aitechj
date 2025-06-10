const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export interface JWTPayload {
  userId: string;
  email: string | null;
  role: string;
  subscriptionTier: string;
  iat?: number;
  exp?: number;
}

export interface CustomJWTPayload extends JWTPayload {}

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  str += '='.repeat((4 - str.length % 4) % 4);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

export function signJWT(payload: Record<string, any>, expiresIn?: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  let exp = now + 60 * 60; // default 1 hour
  
  if (expiresIn === '15m') {
    exp = now + 15 * 60;
  } else if (expiresIn === '24h') {
    exp = now + 24 * 60 * 60;
  } else if (expiresIn === '30d') {
    exp = now + 30 * 24 * 60 * 60;
  }

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  
  const signature = base64UrlEncode(JWT_SECRET + encodedHeader + encodedPayload);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;
    
    const expectedSignature = base64UrlEncode(JWT_SECRET + header + payload);
    if (signature !== expectedSignature) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payload)) as JWTPayload;
    
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(base64UrlDecode(payload)) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const token = cookieStore.get('access_token')?.value || cookieStore.get('guest_token')?.value;
    
    if (!token) {
      const error = new Error('No authentication token found');
      error.name = 'UnauthorizedError';
      throw error;
    }
    
    return await verifyJWT(token);
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      throw error;
    }
    console.error('Get current user failed:', error);
    const authError = new Error('Authentication failed');
    authError.name = 'UnauthorizedError';
    throw authError;
  }
}
