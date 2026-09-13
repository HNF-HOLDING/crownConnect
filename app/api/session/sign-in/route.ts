import { NextRequest, NextResponse } from 'next/server';
import { chatGPTProviderSignInPath, safeAppReturnPath } from '@/app/chatgpt-auth';

const APP_SIGNED_OUT_COOKIE = 'crownconnect_signed_out';

export function GET(request: NextRequest) {
  const returnTo = safeAppReturnPath(request.nextUrl.searchParams.get('return_to') ?? '/');
  const response = NextResponse.redirect(new URL(chatGPTProviderSignInPath(returnTo), request.url));
  response.cookies.set(APP_SIGNED_OUT_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/', sameSite: 'lax', secure: true });
  return response;
}
