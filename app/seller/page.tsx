import Link from 'next/link';
import { requireChatGPTUser, chatGPTSignOutPath } from '../chatgpt-auth';
import { findSellerByUser, listBookingsForSeller } from '@/db/queries';

export const dynamic = 'force-dynamic';

export default async function SellerStudio({ searchParams }: { searchParams: Promise<{ saved?: string; updated?: string }> }) {
  const user = await requireChatGPTUser('/seller');
  const [profile, params] = await Promise.all([findSellerByUser(user.userId), searchParams]);
  const bookings = profile ? await listBookingsForSeller(profile.id) : [];
  return (
    <main className="page-shell">
      <div className="page-top"><Link className="brand" href="/">♛ CrownConnect</Link><div><Link className="button ghost small" href="/">Marketplace</Link> <a className="button ghost small" href={chatGPTSignOutPath('/')}>Sign out</a></div></div>
      <p className="eyebrow">SELLER STUDIO</p><h1>{profile ? `Welcome back, ${profile.business_name}` : 'Bring your business online.'}</h1>
      {params.saved && <p className="notice" role="status">Your seller profile is live. Customers can now send real booking requests.</p>}
      {params.updated && <p className="notice" role="status">Booking status updated.</p>}
      <div className="panel-grid">
        <section className="panel" aria-labelledby="profile-heading">
          <p className="eyebrow">YOUR PROFILE</p><h2 id="profile-heading">{profile ? 'Update your listing' : 'Create your seller profile'}</h2>
          <p>Your featured service appears in the marketplace as soon as you save.</p>
          <form action="/api/seller" method="post" className="form-grid">
            <div className="field full"><label htmlFor="businessName">Business name</label><input id="businessName" name="businessName" required maxLength={80} defaultValue={profile?.business_name} /></div>
            <div className="field"><label htmlFor="city">Town or city</label><input id="city" name="city" required maxLength={80} defaultValue={profile?.city} /></div>
            <div className="field"><label htmlFor="phone">WhatsApp or phone</label><input id="phone" name="phone" type="tel" required maxLength={30} defaultValue={profile?.phone} /></div>
            <div className="field"><label htmlFor="specialty">Specialty</label><select id="specialty" name="specialty" defaultValue={profile?.specialty ?? 'Braids'}><option>Braids</option><option>Wigs</option><option>Weaves</option><option>Natural hair</option><option>Haircare</option></select></div>
            <div className="field"><label htmlFor="servicePrice">Starting price (ZAR)</label><input id="servicePrice" name="servicePrice" type="number" min="1" max="100000" required defaultValue={profile?.service_price ?? 350} /></div>
            <div className="field full"><label htmlFor="featuredService">Featured service</label><input id="featuredService" name="featuredService" required maxLength={100} placeholder="e.g. Knotless braids" defaultValue={profile?.featured_service} /></div>
            <div className="field full"><label htmlFor="bio">About your business</label><textarea id="bio" name="bio" required maxLength={500} placeholder="Tell customers what makes your service special." defaultValue={profile?.bio} /></div>
            <div className="form-actions"><span className="muted">Signed in as {user.email}</span><button className="button" type="submit">{profile ? 'Save changes' : 'Publish profile'}</button></div>
          </form>
        </section>
        <section className="panel" aria-labelledby="requests-heading">
          <p className="eyebrow">INBOX</p><h2 id="requests-heading">Booking requests</h2>
          {!profile ? <div className="empty">Publish your profile to start receiving requests.</div> : !bookings.length ? <div className="empty">No requests yet. Your new bookings will appear here.</div> : <div className="booking-list">{bookings.map((booking) => (
            <article className="booking" key={booking.id}>
              <div className="booking-head"><div><h3>{booking.customer_name}</h3><p>{booking.service_name}<br />{booking.appointment_date} at {booking.appointment_time}</p></div><span className={`status ${booking.status}`}>{booking.status}</span></div>
              <p>{booking.customer_phone}<br />{booking.customer_email}{booking.notes && <><br />“{booking.notes}”</>}</p>
              {booking.status === 'pending' && <form action="/api/bookings/status" method="post" className="inline-actions"><input type="hidden" name="bookingId" value={booking.id} /><button className="button small" name="status" value="confirmed">Confirm</button><button className="button ghost small" name="status" value="declined">Decline</button></form>}
            </article>
          ))}</div>}
        </section>
      </div>
    </main>
  );
}
