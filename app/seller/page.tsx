'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { awsApi, cognitoToken, signOut } from '../aws-client';

type Seller = { id: string; business_name: string; city: string; phone: string; specialty: string; featured_service: string; service_price: number; bio: string; availability_days: string };
type Service = { id: string; name: string; price: number; duration_minutes: number; description: string };
type Media = { id: string; media_type: 'image' | 'video'; content_type: string; file_name: string; url: string };
type Booking = { id: string; customer_name: string; customer_phone: string; customer_email: string; service_name: string; appointment_date: string; appointment_time: string; notes: string; status: string };
type Studio = { seller: Seller | null; services: Service[]; media: Media[]; bookings: Booking[] };
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

async function read(response: Response) {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || 'That request could not be completed.');
  return value;
}

export default function SellerStudio() {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      if (!(await cognitoToken())) { window.location.href = '/sign-in?next=/seller'; return; }
      setStudio(await read(await awsApi('/seller')));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load Seller Studio.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget), payload = Object.fromEntries(form.entries());
    try {
      await read(await awsApi('/seller', { method: 'POST', body: JSON.stringify({ ...payload, servicePrice: Number(payload.servicePrice), availabilityDays: form.getAll('availabilityDays').join(',') }) }));
      setNotice('Your seller profile is live.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save profile.'); } finally { setBusy(false); }
  }

  async function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget), payload = Object.fromEntries(form.entries());
    try {
      await read(await awsApi('/services', { method: 'POST', body: JSON.stringify({ ...payload, price: Number(payload.price), durationMinutes: Number(payload.durationMinutes) }) }));
      event.currentTarget.reset(); setNotice('Service added.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to add service.'); } finally { setBusy(false); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const file = new FormData(event.currentTarget).get('media');
    try {
      if (!(file instanceof File) || !file.size) throw new Error('Choose a photo or video first.');
      const created = await read(await awsApi('/media/upload-url', { method: 'POST', body: JSON.stringify({ fileName: file.name, contentType: file.type }) }));
      const response = await fetch(created.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
      if (!response.ok) throw new Error('The upload to AWS S3 failed.');
      event.currentTarget.reset(); setNotice('Portfolio upload complete.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to upload media.'); } finally { setBusy(false); }
  }

  async function act(path: string, method: string, success: string, body?: object) {
    setBusy(true); setError('');
    try { await read(await awsApi(path, { method, body: body ? JSON.stringify(body) : undefined })); setNotice(success); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to complete that action.'); }
    finally { setBusy(false); }
  }

  if (!studio) return <main className="page-shell"><p>Loading Seller Studio…</p>{error && <p className="notice">{error}</p>}</main>;
  const profile = studio.seller, selectedDays = new Set(profile?.availability_days.split(',') ?? days.slice(0, 6));
  return <main className="page-shell">
    <div className="page-top"><Link className="brand" href="/">♛ CrownConnect</Link><div className="inline-actions"><Link className="button ghost small" href="/marketplace">Marketplace</Link><button className="button ghost small" onClick={async () => { await signOut(); window.location.href = '/'; }}>Sign out</button></div></div>
    <p className="eyebrow">SELLER STUDIO · AWS</p><h1>{profile ? `Welcome back, ${profile.business_name}` : 'Bring your business online.'}</h1>
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="notice" role="alert">{error}</p>}
    <div className="panel-grid">
      <section className="panel"><p className="eyebrow">YOUR PROFILE</p><h2>{profile ? 'Update your listing' : 'Create your seller profile'}</h2><form className="form-grid" onSubmit={submitProfile}>
        <div className="field full"><label>Business name</label><input name="businessName" required defaultValue={profile?.business_name} /></div><div className="field"><label>Town or city</label><input name="city" required defaultValue={profile?.city} /></div><div className="field"><label>WhatsApp or phone</label><input name="phone" required defaultValue={profile?.phone} /></div>
        <div className="field"><label>Specialty</label><select name="specialty" defaultValue={profile?.specialty ?? 'Braids'}><option>Braids</option><option>Wigs</option><option>Weaves</option><option>Natural hair</option><option>Haircare</option></select></div><div className="field"><label>Starting price (ZAR)</label><input name="servicePrice" type="number" min="0" required defaultValue={profile?.service_price ?? 350} /></div>
        <div className="field full"><label>Featured service</label><input name="featuredService" required defaultValue={profile?.featured_service} /></div><div className="field full"><label>About your business</label><textarea name="bio" required defaultValue={profile?.bio} /></div>
        <fieldset className="field full availability-field"><legend>Days you accept bookings</legend><div className="day-options">{days.map(day => <label className="day-option" key={day}><input type="checkbox" name="availabilityDays" value={day} defaultChecked={selectedDays.has(day)} /> {day}</label>)}</div></fieldset><div className="form-actions"><span className="muted">Saved securely in AWS.</span><button disabled={busy} className="button">{busy ? 'Saving…' : 'Save profile'}</button></div>
      </form></section>
      <section className="panel"><p className="eyebrow">SERVICE MENU</p><h2>What customers can book</h2>{!profile ? <div className="empty">Publish your profile first.</div> : <><form className="form-grid" onSubmit={addService}><div className="field full"><label>Service name</label><input name="name" required /></div><div className="field"><label>Price (ZAR)</label><input name="price" type="number" min="0" required /></div><div className="field"><label>Duration (minutes)</label><input name="durationMinutes" type="number" min="15" step="15" defaultValue="120" required /></div><div className="field full"><label>Description</label><input name="description" /></div><div className="form-actions"><span /><button disabled={busy} className="button">Add service</button></div></form><div className="service-menu">{studio.services.map(service => <article className="service-row" key={service.id}><strong>{service.name}</strong><span>R{service.price} · {service.duration_minutes} min</span><p>{service.description}</p></article>)}</div></> }</section>
      <section className="panel"><p className="eyebrow">YOUR PORTFOLIO</p><h2>Show your work</h2>{!profile ? <div className="empty">Publish your profile first.</div> : <><form className="upload-form" onSubmit={upload}><label>Photo or video</label><input name="media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required /><button disabled={busy} className="button small">Upload to AWS</button></form><div className="portfolio-grid">{studio.media.map(item => <figure className="portfolio-item" key={item.id}>{item.media_type === 'image' ? <img src={item.url} alt={item.file_name} /> : <video controls src={item.url} />}<button disabled={busy} className="remove-media" onClick={() => void act(`/media/${item.id}`, 'DELETE', 'Portfolio item removed.')}>Remove</button></figure>)}</div></>}</section>
      <section className="panel"><p className="eyebrow">INBOX</p><h2>Booking requests</h2>{!studio.bookings.length ? <div className="empty">No requests yet.</div> : <div className="booking-list">{studio.bookings.map(booking => <article className="booking" key={booking.id}><div className="booking-head"><div><h3>{booking.customer_name}</h3><p>{booking.service_name}<br />{booking.appointment_date} at {booking.appointment_time}</p></div><span className={`status ${booking.status}`}>{booking.status}</span></div><p>{booking.customer_phone}<br />{booking.customer_email}{booking.notes && <><br />“{booking.notes}”</>}</p>{booking.status === 'pending' && <div className="inline-actions"><button disabled={busy} className="button small" onClick={() => void act(`/bookings/${booking.id}/status`, 'PATCH', 'Booking confirmed.', { status: 'confirmed' })}>Confirm</button><button disabled={busy} className="button ghost small" onClick={() => void act(`/bookings/${booking.id}/status`, 'PATCH', 'Booking declined.', { status: 'declined' })}>Decline</button></div>}</article>)}</div>}</section>
    </div>
  </main>;
}
