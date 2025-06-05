import { db, refreshTokens } from '../db';
import { eq, lt } from 'drizzle-orm';
import { hashPassword } from './password';
import crypto from 'crypto';

export async function generateRefreshToken(): Promise<string> {
  return crypto.randomBytes(32).toString('hex');
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = await hashPassword(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });
}

export async function verifyRefreshToken(userId: string, token: string): Promise<boolean> {
  const tokenHash = await hashPassword(token);
  
  const storedTokens = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.userId, userId));

  for (const storedToken of storedTokens) {
    const isValid = await hashPassword(token) === storedToken.tokenHash;
    if (isValid && storedToken.expiresAt > new Date()) {
      return true;
    }
  }
  
  return false;
}

export async function revokeRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = await hashPassword(token);
  
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.userId, userId));
}

export async function cleanupExpiredTokens(): Promise<void> {
  await db
    .delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, new Date()));
}
