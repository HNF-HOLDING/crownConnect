import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findSellerByUser, getDatabase } from '@/db/queries';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const form = await request.formData();
  const bookingId = Number(form.get('bookingId')), status = String(form.get('status') ?? '');
  const seller = await findSellerByUser(user.userId);
  if (!seller || !Number.isInteger(bookingId) || !['confirmed', 'declined'].includes(status)) return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
  await getDatabase().prepare('UPDATE booking_requests SET status = ? WHERE id = ? AND seller_id = ? AND status = ?').bind(status, bookingId, seller.id, 'pending').run();
  return NextResponse.redirect(new URL('/seller?updated=1', request.url), 303);
}
