import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findSellerByUser, getDatabase } from '@/db/queries';

function text(form: FormData, key: string, max: number) { return String(form.get(key) ?? '').trim().slice(0, max) }

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const seller = await findSellerByUser(user.userId);
  const form = await request.formData();
  const name = text(form, 'name', 100), description = text(form, 'description', 240), price = Number(form.get('price')), duration = Number(form.get('duration'));
  if (!seller || !name || !Number.isInteger(price) || price < 1 || price > 100000 || !Number.isInteger(duration) || duration < 15 || duration > 720) return NextResponse.json({ error: 'Check the service details and try again.' }, { status: 400 });
  await getDatabase().prepare('INSERT INTO seller_services (seller_id, name, price, duration_minutes, description, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(seller.id, name, price, duration, description, Date.now()).run();
  return NextResponse.redirect(new URL('/seller?service=1', request.url), 303);
}
