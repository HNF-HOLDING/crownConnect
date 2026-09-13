import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDatabase } from '@/db/queries';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const form = await request.formData();
  const bookingId = Number(form.get('bookingId'));
  if (!Number.isInteger(bookingId)) return NextResponse.json({ error: 'Invalid booking' }, { status: 400 });
  await getDatabase().prepare("UPDATE booking_requests SET status = 'cancelled' WHERE id = ? AND customer_user_id = ? AND status = 'pending'").bind(bookingId, user.userId).run();
  return NextResponse.redirect(new URL('/my-bookings?cancelled=1', request.url), 303);
}
