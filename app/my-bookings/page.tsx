'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { awsApi, cognitoToken, signOut } from '../aws-client';

type Booking = { id: string; business_name: string; city: string; seller_phone: string; service_name: string; appointment_date: string; appointment_time: string; notes: string; status: string };

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]), [loading, setLoading] = useState(true), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      if (!(await cognitoToken())) { window.location.href = '/sign-in?next=/my-bookings'; return; }
      const response = await awsApi('/bookings'), data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load bookings.');
      setBookings(data.bookings);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load bookings.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function cancel(id: string) {
    setError(''); const response = await awsApi(`/bookings/${id}/cancel`, { method: 'PATCH' }), data = await response.json();
    if (!response.ok) { setError(data.error || 'Unable to cancel booking.'); return; }
    setNotice('Your booking was cancelled.'); await load();
  }
  return <main className="page-shell">
    <div className="page-top"><Link className="brand" href="/">♛ CrownConnect</Link><div className="inline-actions"><Link className="button ghost small" href="/marketplace">Marketplace</Link><Link className="button ghost small" href="/seller">Seller Studio</Link><button className="button ghost small" onClick={async () => { await signOut(); window.location.href = '/'; }}>Sign out</button></div></div>
    <p className="eyebrow">CUSTOMER SPACE · AWS</p><h1>Your booking requests.</h1>{notice && <p className="notice">{notice}</p>}{error && <p className="notice" role="alert">{error}</p>}
    {loading ? <div className="empty">Loading bookings…</div> : !bookings.length ? <div className="empty">No requests yet. Browse local stylists to get started.</div> : <section className="booking-list">{bookings.map(booking => <article className="booking" key={booking.id}><div className="booking-head"><div><h2>{booking.business_name}</h2><p>{booking.service_name}<br />{booking.appointment_date} at {booking.appointment_time} · {booking.city}</p></div><span className={`status ${booking.status}`}>{booking.status}</span></div><p>Seller phone: {booking.seller_phone}{booking.notes && <><br />“{booking.notes}”</>}</p>{['pending', 'confirmed'].includes(booking.status) && <button className="button ghost small" onClick={() => void cancel(booking.id)}>Cancel booking</button>}</article>)}</section>}
  </main>;
}
