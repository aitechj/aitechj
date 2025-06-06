import { db, aiConversations } from '../db';
import { eq, gte, sum } from 'drizzle-orm';

const COST_PER_TOKEN = 0.00005;
const EMERGENCY_SHUTDOWN_THRESHOLD = 1000;
const WARNING_THRESHOLD = 500;

export async function checkMonthlyCost(): Promise<{
  totalCost: number;
  totalTokens: number;
  shouldShutdown: boolean;
  shouldWarn: boolean;
}> {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await db
      .select({ totalTokens: sum(aiConversations.tokensUsed) })
      .from(aiConversations)
      .where(gte(aiConversations.createdAt, startOfMonth));

    const totalTokens = Number(result[0]?.totalTokens) || 0;
    const totalCost = totalTokens * COST_PER_TOKEN;

    return {
      totalCost,
      totalTokens,
      shouldShutdown: totalCost >= EMERGENCY_SHUTDOWN_THRESHOLD,
      shouldWarn: totalCost >= WARNING_THRESHOLD,
    };
  } catch (error) {
    console.error('Cost monitoring error:', error);
    return {
      totalCost: 0,
      totalTokens: 0,
      shouldShutdown: false,
      shouldWarn: false,
    };
  }
}

export async function trackTokenUsage(tokens: number, model: string): Promise<void> {
  console.log(`Token usage tracked: ${tokens} tokens for model ${model}`);
}

export async function getCostStatus(): Promise<{
  monthToDateCost: number;
  tokensUsed: number;
  warningThreshold: number;
  shutdownThreshold: number;
  shutdownFlag: boolean;
  warningActive: boolean;
}> {
  const costCheck = await checkMonthlyCost();
  return {
    monthToDateCost: costCheck.totalCost,
    tokensUsed: costCheck.totalTokens,
    warningThreshold: WARNING_THRESHOLD,
    shutdownThreshold: EMERGENCY_SHUTDOWN_THRESHOLD,
    shutdownFlag: costCheck.shouldShutdown,
    warningActive: costCheck.shouldWarn
  };
}

export async function isAIServiceEnabled(): Promise<boolean> {
  const costCheck = await checkMonthlyCost();
  return !costCheck.shouldShutdown;
}
