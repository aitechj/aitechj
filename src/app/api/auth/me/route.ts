import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 /api/auth/me called');
    const user = await getCurrentUser(request);
    
    if (!user) {
      console.log('❌ No user found in /api/auth/me');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    console.log('✅ User found in /api/auth/me:', { userId: user.userId, role: user.role, tier: user.subscriptionTier });
    
    return NextResponse.json({
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      }
    });
  } catch (error) {
    console.error('❌ /api/auth/me error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
