import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDatabase } from '@/db/queries';

function text(form: FormData, key: string, max: number) { return String(form.get(key) ?? '').trim().slice(0, max) }

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const form = await request.formData();
  const businessName = text(form, 'businessName', 80), city = text(form, 'city', 80), phone = text(form, 'phone', 30), specialty = text(form, 'specialty', 40), featuredService = text(form, 'featuredService', 100), bio = text(form, 'bio', 500), servicePrice = Number(form.get('servicePrice'));
  if (!businessName || !city || !phone || !specialty || !featuredService || !bio || !Number.isInteger(servicePrice) || servicePrice < 1 || servicePrice > 100000) return NextResponse.json({ error: 'Check the profile details and try again.' }, { status: 400 });
  const now = Date.now();
  await getDatabase().prepare(`INSERT INTO seller_profiles (user_id, email, business_name, city, phone, specialty, featured_service, service_price, bio, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, business_name = excluded.business_name, city = excluded.city, phone = excluded.phone, specialty = excluded.specialty, featured_service = excluded.featured_service, service_price = excluded.service_price, bio = excluded.bio, updated_at = excluded.updated_at`).bind(user.userId, user.email, businessName, city, phone, specialty, featuredService, servicePrice, bio, now, now).run();
  return NextResponse.redirect(new URL('/seller?saved=1', request.url), 303);
}
