import { NextRequest, NextResponse } from 'next/server';

const APP_SIGNED_OUT_COOKIE = 'crownconnect_signed_out';

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(APP_SIGNED_OUT_COOKIE, '1', { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', secure: true });
  return response;
}
