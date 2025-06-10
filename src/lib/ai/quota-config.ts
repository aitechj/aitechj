export const QUOTA_CONFIG = {
  LIMITS: {
    guest: 3,
    basic: 50, 
    premium: 200,
    admin: 999999,
  } as const,
  LOCK_TIMEOUT_MS: 5000,
  RETRY_ATTEMPTS: 3,
} as const;

export type SubscriptionTier = keyof typeof QUOTA_CONFIG.LIMITS;

export function getQuotaLimit(tier: string): number {
  return QUOTA_CONFIG.LIMITS[tier as SubscriptionTier] || 0;
}

export function isValidSubscriptionTier(tier: string): tier is SubscriptionTier {
  return tier in QUOTA_CONFIG.LIMITS;
}
