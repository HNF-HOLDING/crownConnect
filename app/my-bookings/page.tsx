import Link from 'next/link';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { listBookingsForCustomer } from '@/db/queries';

export const dynamic = 'force-dynamic';

export default async function MyBookings({ searchParams }: { searchParams: Promise<{ sent?: string; cancelled?: string }> }) {
  const user = await requireChatGPTUser('/my-bookings');
  const [bookings, params] = await Promise.all([listBookingsForCustomer(user.userId), searchParams]);
  return <main className="page-shell">
    <div className="page-top"><a className="brand" href="/">♛ CrownConnect</a><Link className="button ghost small" href="/">Find a stylist</Link></div>
    <p className="eyebrow">CUSTOMER SPACE</p><h1>Your booking requests.</h1>
    {params.sent && <p className="notice" role="status">Request sent. The stylist will confirm or decline it here.</p>}
    {params.cancelled && <p className="notice" role="status">Your pending request was cancelled.</p>}
    {!bookings.length ? <div className="empty">No requests yet. Browse local stylists to get started.</div> : <section className="booking-list" aria-label="Your booking requests">{bookings.map((booking) => <article className="booking" key={booking.id}>
      <div className="booking-head"><div><h2>{booking.business_name}</h2><p>{booking.service_name}<br />{booking.appointment_date} at {booking.appointment_time} · {booking.city}</p></div><span className={`status ${booking.status}`}>{booking.status}</span></div>
      {booking.status === 'pending' && <form action="/api/bookings/cancel" method="post" className="inline-actions"><input type="hidden" name="bookingId" value={booking.id} /><button className="button ghost small" type="submit">Cancel request</button></form>}
    </article>)}</section>}
  </main>;
}
