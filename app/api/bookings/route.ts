import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findSeller, findSellerService, getDatabase, isSlotTaken } from '@/db/queries';

function text(form: FormData, key: string, max: number) { return String(form.get(key) ?? '').trim().slice(0, max) }
function southAfricaToday() { const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const value = (name: string) => parts.find((part) => part.type === name)?.value; return `${value('year')}-${value('month')}-${value('day')}`; }
function weekday(date: string) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${date}T12:00:00Z`).getUTCDay()]; }

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const form = await request.formData();
  const sellerId = Number(form.get('sellerId')), serviceId = Number(form.get('serviceId')), customerName = text(form, 'customerName', 80), customerPhone = text(form, 'customerPhone', 30), appointmentDate = text(form, 'appointmentDate', 10), appointmentTime = text(form, 'appointmentTime', 5), notes = text(form, 'notes', 500);
  const seller = Number.isInteger(sellerId) ? await findSeller(sellerId) : null;
  const selectedService = seller && Number.isInteger(serviceId) && serviceId > 0 ? await findSellerService(seller.id, serviceId) : null;
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) && !Number.isNaN(Date.parse(`${appointmentDate}T12:00:00Z`));
  const available = seller?.availability_days.split(',').includes(weekday(appointmentDate));
  if (!seller || !customerName || !customerPhone || !isDate || appointmentDate < southAfricaToday() || !available || !['09:00', '11:00', '13:00', '15:00'].includes(appointmentTime)) return NextResponse.json({ error: 'Choose an available future date and time, then try again.' }, { status: 400 });
  if (await isSlotTaken(seller.id, appointmentDate, appointmentTime)) return NextResponse.json({ error: 'That time has just been requested. Please choose another slot.' }, { status: 409 });
  try {
    await getDatabase().prepare(`INSERT INTO booking_requests (seller_id, customer_user_id, customer_email, customer_name, customer_phone, service_name, appointment_date, appointment_time, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`).bind(seller.id, user.userId, user.email, customerName, customerPhone, selectedService?.name ?? seller.featured_service, appointmentDate, appointmentTime, notes, Date.now()).run();
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed')) return NextResponse.json({ error: 'That time has just been requested. Please choose another slot.' }, { status: 409 });
    throw error;
  }
  return NextResponse.redirect(new URL('/my-bookings?sent=1', request.url), 303);
}
