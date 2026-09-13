import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const form = await request.formData();
  const fullName = String(form.get('fullName') ?? '').trim().slice(0, 100);
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 254);
  const phone = String(form.get('phone') ?? '').trim().slice(0, 40);
  const role = String(form.get('role') ?? '');
  const returnTo = String(form.get('returnTo') ?? '');
  if (!fullName || !email.includes('@') || (role !== 'customer' && role !== 'seller')) return NextResponse.redirect(new URL(`/register/details?role=${role === 'seller' ? 'seller' : 'customer'}`, request.url), 303);
  const safeReturnTo = returnTo.startsWith('/register?role=') ? returnTo : `/register?role=${role}`;
  const response = NextResponse.redirect(new URL(`/api/session/sign-in?return_to=${encodeURIComponent(safeReturnTo)}`, request.url), 303);
  response.cookies.set('crownconnect_application', encodeURIComponent(JSON.stringify({ fullName, email, phone, role })), { httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax', secure: true });
  return response;
}
