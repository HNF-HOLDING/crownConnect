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
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '';
  return NextResponse.redirect(new URL(safeReturnTo || (role === 'seller' ? '/seller?role=seller' : '/customer?role=customer'), request.url), 303);
}
