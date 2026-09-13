import { notFound } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { findAccountProfile, findSeller } from '@/db/queries';
import { redirect } from 'next/navigation';
import { AccountMenu } from '@/app/account-menu';
import { listSellerServices } from '@/db/queries';
import { BookingForm } from './booking-form';

export const dynamic = 'force-dynamic';
function southAfricaToday() { const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const value = (name: string) => parts.find((part) => part.type === name)?.value; return `${value('year')}-${value('month')}-${value('day')}`; }

export default async function BookSeller({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const sellerId = Number(id);
  if (!Number.isInteger(sellerId) || sellerId < 1) notFound();
  const user = await requireChatGPTUser(`/book/${sellerId}`);
  const [seller, account] = await Promise.all([findSeller(sellerId), findAccountProfile(user.userId)]);
  if (!account) redirect('/welcome');
  if (!seller) notFound();
  const services = await listSellerServices(seller.id);
  return (
    <main className="page-shell">
      <div className="page-top"><a className="brand" href="/">♛ CrownConnect</a><AccountMenu role={account.primary_role} /></div>
      <div className="panel-grid">
        <section><p className="eyebrow">BOOK {seller.business_name.toUpperCase()}</p><h1>Request your next appointment.</h1><p>{seller.bio}</p><div className="service-summary"><strong>{seller.featured_service}</strong><p>From R{seller.service_price.toLocaleString('en-ZA')} · {seller.city}</p></div><p className="availability-copy"><strong>Available:</strong> {seller.availability_days.split(',').map((day) => ({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[day] ?? day)).join(', ')}.</p><p className="muted">This sends a request, not an automatic confirmation. Unavailable or already-requested slots cannot be booked.</p></section>
        <section className="panel" aria-labelledby="booking-heading">
          <h2 id="booking-heading">Choose a date and time</h2>
          {query.sent ? <div className="notice" role="status"><strong>Request sent.</strong><br />{seller.business_name} can now review your booking. Keep their number handy: {seller.phone}.</div> : <BookingForm sellerId={seller.id} availableDays={seller.availability_days.split(',')} services={services} fallbackService={seller.featured_service} fallbackPrice={seller.service_price} defaultName={user.fullName ?? ''} email={user.email} minimumDate={southAfricaToday()} />}
        </section>
      </div>
    </main>
  );
}
