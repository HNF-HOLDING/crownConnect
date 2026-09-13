import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { findAccountProfile, listBookingsForCustomer } from '@/db/queries';
import { AccountMenu } from '@/app/account-menu';

export const dynamic = 'force-dynamic';

export default async function CustomerSpace() {
  const user = await requireChatGPTUser('/customer');
  const [account, bookings] = await Promise.all([findAccountProfile(user.userId), listBookingsForCustomer(user.userId)]);
  if (!account) redirect('/welcome');
  const active = bookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed');
  return <main className="page-shell customer-space">
    <div className="page-top"><a className="brand" href="/">♛ CrownConnect</a><AccountMenu role={account.primary_role} name={user.fullName ?? user.email} /></div>
    <p className="eyebrow">CUSTOMER SPACE</p><h1>Welcome, {user.fullName ?? 'there'}.</h1><p className="space-lead">Find a stylist, request a time, and keep every appointment in one place.</p>
    <section className="customer-actions"><Link className="button" href="/marketplace">Find a stylist</Link><Link className="button ghost" href="/my-bookings">View my bookings</Link></section>
    <section className="panel customer-summary"><p className="eyebrow">YOUR APPOINTMENTS</p><h2>{active.length ? `${active.length} active ${active.length === 1 ? 'request' : 'requests'}` : 'No active requests yet'}</h2>{active.length ? <div className="booking-list">{active.slice(0, 3).map((booking) => <article className="booking" key={booking.id}><div className="booking-head"><div><h3>{booking.business_name}</h3><p>{booking.service_name}<br />{booking.appointment_date} at {booking.appointment_time}</p></div><span className={`status ${booking.status}`}>{booking.status}</span></div></article>)}</div> : <p>When you request an appointment, its status will appear here.</p>}<Link className="text-link" href="/my-bookings">See all bookings →</Link></section>
    <section className="switch-strip"><div><strong>Do you provide hair services too?</strong><p>You can open Seller Studio and create a business listing whenever you’re ready.</p></div><Link className="button ghost small" href="/seller">Open Seller Studio</Link></section>
  </main>;
}
