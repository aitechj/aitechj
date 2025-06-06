import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth/jwt';
import { checkMonthlyCost } from '../../../../lib/ai/cost-monitor';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const costData = await checkMonthlyCost();
    
    return NextResponse.json({
      ...costData,
      costPerToken: 0.00005,
      emergencyThreshold: 1000,
      warningThreshold: 500,
    });

  } catch (error) {
    console.error('Cost monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
