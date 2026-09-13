import Link from 'next/link';
import { requireChatGPTUser } from '../chatgpt-auth';
import { findSellerByUser, listBookingsForSeller, listSellerMedia, listSellerServices } from '@/db/queries';
import { findAccountProfile } from '@/db/queries';
import { redirect } from 'next/navigation';
import { AccountMenu } from '@/app/account-menu';

export const dynamic = 'force-dynamic';
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default async function SellerStudio({ searchParams }: { searchParams: Promise<{ saved?: string; updated?: string; service?: string; media?: string; mediaDeleted?: string; role?: string }> }) {
  const user = await requireChatGPTUser('/seller');
  const [profile, account, params] = await Promise.all([findSellerByUser(user.userId), findAccountProfile(user.userId), searchParams]);
  if (!account) redirect('/welcome');
  const bookings = profile ? await listBookingsForSeller(profile.id) : [];
  const [services, media] = profile ? await Promise.all([listSellerServices(profile.id), listSellerMedia(profile.id)]) : [[], []];
  const availableDays = new Set(profile?.availability_days.split(',') ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  return (
    <main className="page-shell">
      <div className="page-top"><a className="brand" href="/">♛ CrownConnect</a><AccountMenu role={account.primary_role} name={user.fullName ?? user.email} /></div>
      <p className="eyebrow">SELLER STUDIO</p><h1>{profile ? `Welcome back, ${profile.business_name}` : 'Bring your business online.'}</h1>
      {account.primary_role !== 'seller' && <p className="notice">You’re in Seller Studio. <Link href="/welcome?switch=1">Make Seller Studio your default space</Link>, or keep Customer Space as your home.</p>}
      {params.saved && <p className="notice" role="status">Your seller profile is live. Customers can now send real booking requests.</p>}
      {params.updated && <p className="notice" role="status">Booking status updated.</p>}
      {params.service && <p className="notice" role="status">Service added to your booking menu.</p>}
      {params.media && <p className="notice" role="status">Your portfolio upload is live.</p>}
      {params.mediaDeleted && <p className="notice" role="status">Portfolio item removed.</p>}
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
            <fieldset className="field full availability-field"><legend>Days you accept bookings</legend><div className="day-options">{days.map((day) => <label className="day-option" key={day}><input type="checkbox" name="availabilityDays" value={day} defaultChecked={availableDays.has(day)} /> {day}</label>)}</div></fieldset>
            <div className="form-actions"><span className="muted">Signed in as {user.email}</span><button className="button" type="submit">{profile ? 'Save changes' : 'Publish profile'}</button></div>
          </form>
        </section>
        <section className="panel" aria-labelledby="services-heading">
          <p className="eyebrow">SERVICE MENU</p><h2 id="services-heading">What customers can book</h2>
          {!profile ? <div className="empty">Publish your profile before adding services.</div> : <><p>Add the services, prices, and expected time customers need to decide.</p><form action="/api/services" method="post" className="form-grid compact-form">
            <div className="field full"><label htmlFor="name">Service name</label><input id="name" name="name" required maxLength={100} placeholder="e.g. Knotless braids" /></div>
            <div className="field"><label htmlFor="price">Price (ZAR)</label><input id="price" name="price" type="number" min="1" max="100000" required /></div>
            <div className="field"><label htmlFor="duration">Duration (minutes)</label><input id="duration" name="duration" type="number" min="15" max="720" step="15" required defaultValue={120} /></div>
            <div className="field full"><label htmlFor="description">Short description (optional)</label><input id="description" name="description" maxLength={240} placeholder="What is included?" /></div>
            <div className="form-actions"><span className="muted">Your current featured service remains available too.</span><button className="button" type="submit">Add service</button></div>
          </form><div className="service-menu">{services.length ? services.map((service) => <article key={service.id} className="service-row"><strong>{service.name}</strong><span>R{service.price.toLocaleString('en-ZA')} · {service.duration_minutes} min</span>{service.description && <p>{service.description}</p>}</article>) : <p className="muted">No extra services yet. Your featured service is still bookable.</p>}</div></>}
        </section>
        <section className="panel" aria-labelledby="portfolio-heading">
          <p className="eyebrow">YOUR PORTFOLIO</p><h2 id="portfolio-heading">Show your work</h2>
          {!profile ? <div className="empty">Publish your profile before uploading photos or videos.</div> : <><p>Upload hairstyle photos or short videos so customers can see your work before booking.</p><form action="/api/media" method="post" encType="multipart/form-data" className="upload-form"><label htmlFor="media">Photo or video <span className="muted">JPG, PNG, WebP, MP4, or WebM · photos up to 10 MB, videos up to 25 MB</span></label><input id="media" name="media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required /><button className="button small" type="submit">Upload to portfolio</button></form>{media.length ? <div className="portfolio-grid">{media.map((item) => <figure className="portfolio-item" key={item.id}>{item.media_type === 'image' ? <img src={`/api/media/${item.id}`} alt={`${profile.business_name} portfolio: ${item.file_name}`} /> : <video controls preload="metadata"><source src={`/api/media/${item.id}`} type={item.content_type} /></video>}<form action="/api/media/delete" method="post"><input type="hidden" name="mediaId" value={item.id} /><button className="remove-media" type="submit" aria-label={`Remove ${item.file_name}`}>Remove</button></form></figure>)}</div> : <p className="muted">Your portfolio is empty. Add your best work first.</p>}</>}
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
