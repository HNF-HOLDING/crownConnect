import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findSeller, getDatabase } from '@/db/queries';

function text(form: FormData, key: string, max: number) { return String(form.get(key) ?? '').trim().slice(0, max) }

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const form = await request.formData();
  const sellerId = Number(form.get('sellerId')), customerName = text(form, 'customerName', 80), customerPhone = text(form, 'customerPhone', 30), appointmentDate = text(form, 'appointmentDate', 10), appointmentTime = text(form, 'appointmentTime', 5), notes = text(form, 'notes', 500);
  const seller = Number.isInteger(sellerId) ? await findSeller(sellerId) : null;
  const today = new Date().toISOString().slice(0, 10);
  if (!seller || !customerName || !customerPhone || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || appointmentDate < today || !['09:00', '11:00', '13:00', '15:00'].includes(appointmentTime)) return NextResponse.json({ error: 'Check the booking details and try again.' }, { status: 400 });
  await getDatabase().prepare(`INSERT INTO booking_requests (seller_id, customer_user_id, customer_email, customer_name, customer_phone, service_name, appointment_date, appointment_time, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`).bind(seller.id, user.userId, user.email, customerName, customerPhone, seller.featured_service, appointmentDate, appointmentTime, notes, Date.now()).run();
  return NextResponse.redirect(new URL(`/book/${seller.id}?sent=1`, request.url), 303);
}
