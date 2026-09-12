import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { findSeller } from '@/db/queries';

export const dynamic = 'force-dynamic';

export default async function BookSeller({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const sellerId = Number(id);
  if (!Number.isInteger(sellerId) || sellerId < 1) notFound();
  const [user, seller] = await Promise.all([requireChatGPTUser(`/book/${sellerId}`), findSeller(sellerId)]);
  if (!seller) notFound();
  return (
    <main className="page-shell">
      <div className="page-top"><Link className="brand" href="/">♛ CrownConnect</Link><Link className="button ghost small" href="/">Back to stylists</Link></div>
      <div className="panel-grid">
        <section><p className="eyebrow">BOOK {seller.business_name.toUpperCase()}</p><h1>Request your next appointment.</h1><p>{seller.bio}</p><div className="service-summary"><strong>{seller.featured_service}</strong><p>From R{seller.service_price.toLocaleString('en-ZA')} · {seller.city}</p></div><p className="muted">This sends a request, not an automatic confirmation. The stylist will confirm or decline it in their seller studio.</p></section>
        <section className="panel" aria-labelledby="booking-heading">
          <h2 id="booking-heading">Choose a date and time</h2>
          {query.sent ? <div className="notice" role="status"><strong>Request sent.</strong><br />{seller.business_name} can now review your booking. Keep their number handy: {seller.phone}.</div> : <form action="/api/bookings" method="post" className="form-grid">
            <input type="hidden" name="sellerId" value={seller.id} />
            <div className="field full"><label htmlFor="customerName">Your name</label><input id="customerName" name="customerName" required maxLength={80} defaultValue={user.fullName ?? ''} /></div>
            <div className="field full"><label htmlFor="customerPhone">WhatsApp or phone</label><input id="customerPhone" name="customerPhone" type="tel" required maxLength={30} /></div>
            <div className="field"><label htmlFor="appointmentDate">Preferred date</label><input id="appointmentDate" name="appointmentDate" type="date" required /></div>
            <div className="field"><label htmlFor="appointmentTime">Preferred time</label><select id="appointmentTime" name="appointmentTime"><option>09:00</option><option>11:00</option><option>13:00</option><option>15:00</option></select></div>
            <div className="field full"><label htmlFor="notes">Notes for the stylist (optional)</label><textarea id="notes" name="notes" maxLength={500} placeholder="Hair length, colour, or anything they should know." /></div>
            <div className="form-actions"><span className="muted">Updates go to {user.email}</span><button className="button" type="submit">Send booking request</button></div>
          </form>}
        </section>
      </div>
    </main>
  );
}
