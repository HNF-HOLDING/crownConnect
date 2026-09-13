import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findSeller, listTakenTimes } from '@/db/queries';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function GET(request: Request) {
  if (!await getChatGPTUser()) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { searchParams } = new URL(request.url), sellerId = Number(searchParams.get('sellerId')), date = String(searchParams.get('date') ?? '');
  if (!Number.isInteger(sellerId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const seller = await findSeller(sellerId);
  if (!seller) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const day = days[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return NextResponse.json({ available: seller.availability_days.split(',').includes(day), takenTimes: await listTakenTimes(sellerId, date) });
}
