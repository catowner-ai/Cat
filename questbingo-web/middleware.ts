import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ALLOWED_METHODS = 'GET,POST,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  // Only apply to /api/*
  const isPreflight = req.method === 'OPTIONS';
  if (isPreflight) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};