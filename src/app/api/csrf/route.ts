import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, setCSRFCookie } from '../../../lib/security/csrf';

export async function GET(request: NextRequest) {
  const token = generateCSRFToken();
  const response = NextResponse.json({ token });
  
  setCSRFCookie(response, token);
  
  return response;
}
