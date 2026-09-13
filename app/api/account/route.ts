import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDatabase } from '@/db/queries';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const form = await request.formData();
  const role = String(form.get('role') ?? '');
  const returnTo = String(form.get('returnTo') ?? '');
  if (role !== 'customer' && role !== 'seller') return NextResponse.json({ error: 'Choose Customer or Seller.' }, { status: 400 });
  const now = Date.now();
  await getDatabase().prepare(`INSERT INTO account_profiles (user_id, email, primary_role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, primary_role = excluded.primary_role, updated_at = excluded.updated_at`).bind(user.userId, user.email, role, now, now).run();
  const pending = (await cookies()).get('crownconnect_application')?.value;
  if (pending) {
    try {
      const application = JSON.parse(decodeURIComponent(pending)) as { fullName?: string; email?: string; phone?: string; role?: string };
      if (application.role === role && application.fullName && application.email) await getDatabase().prepare(`INSERT INTO customer_applications (user_id, full_name, email, phone, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET full_name = excluded.full_name, email = excluded.email, phone = excluded.phone, role = excluded.role, updated_at = excluded.updated_at`).bind(user.userId, application.fullName, application.email, application.phone ?? '', role, now, now).run();
    } catch {}
  }
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '';
  const response = NextResponse.redirect(new URL(safeReturnTo || (role === 'seller' ? '/seller?role=seller' : '/customer?role=customer'), request.url), 303);
  response.cookies.set('crownconnect_application', '', { httpOnly: true, maxAge: 0, path: '/', sameSite: 'lax', secure: true });
  return response;
}
