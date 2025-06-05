function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
import { db } from '../db';
import { refreshTokens } from '../db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';

export async function generateRefreshToken(): Promise<string> {
  return generateRandomString(64);
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.insert(refreshTokens).values({
    userId,
    tokenHash: token,
    expiresAt,
  });
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, token));
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export async function validateRefreshToken(token: string): Promise<string | null> {
  const result = await db
    .select({ userId: refreshTokens.userId })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, token),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  return result.length > 0 ? result[0].userId : null;
}

export async function cleanupExpiredTokens(): Promise<void> {
  await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
}
