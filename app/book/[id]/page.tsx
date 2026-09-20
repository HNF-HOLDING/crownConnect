'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiUrl, awsApi, cognitoToken } from '@/app/aws-client';

type Seller = {
  id: string;
  business_name: string;
  city: string;
  specialty: string;
  featured_service: string;
  service_price: number;
  bio: string;
  availability_days: string;
};
type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string;
};
type Media = {
  id: string;
  media_type: 'image' | 'video';
  content_type: string;
  file_name: string;
  url: string;
};
type Details = { seller: Seller; services: Service[]; media: Media[] };
type Account = {
  full_name: string;
  phone: string;
  city: string;
  province: string;
};
const slots = ['09:00', '11:00', '13:00', '15:00'];
function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function BookSeller() {
  const params = useParams<{ id: string }>(),
    id = String(params.id);
  const [details, setDetails] = useState<Details | null>(null),
    [account, setAccount] = useState<Account | null>(null);
  const [date, setDate] = useState(''),
    [taken, setTaken] = useState<string[]>([]),
    [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [message, setMessage] = useState(''),
    [signedIn, setSignedIn] = useState<boolean | null>(null);
  const days = details?.seller.availability_days.split(',') ?? [];
  const weekday = useMemo(
    () =>
      date
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
            new Date(`${date}T12:00:00Z`).getUTCDay()
          ]
        : '',
    [date],
  );
  const available = !date || days.includes(weekday);

  useEffect(() => {
    void (async () => {
      try {
        const sellerResponse = await fetch(`${apiUrl}/sellers/${id}`);
        if (!sellerResponse.ok) throw new Error('Seller not found.');
        setDetails(await sellerResponse.json());
        const token = await cognitoToken();
        setSignedIn(Boolean(token));
        if (token) {
          const response = await awsApi('/account'),
            data = await response.json();
          if (response.ok) setAccount(data.account);
        }
      } catch (cause) {
        setMessage(
          cause instanceof Error
            ? cause.message
            : 'Unable to load this seller.',
        );
        setSignedIn(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);
  useEffect(() => {
    if (!date || !available) {
      setTaken([]);
      return;
    }
    void fetch(`${apiUrl}/availability?sellerId=${id}&date=${date}`)
      .then((response) => response.json())
      .then((data) => setTaken(data.takenTimes ?? []))
      .catch(() => setTaken([]));
  }, [id, date, available]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!account?.full_name || !account.phone) {
      setMessage('Complete your CrownConnect account before booking.');
      return;
    }
    setSending(true);
    const form = new FormData(event.currentTarget);
    const response = await awsApi('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        sellerId: Number(id),
        serviceId: Number(form.get('serviceId')) || undefined,
        customerName: account.full_name,
        customerPhone: account.phone,
        appointmentDate: date,
        appointmentTime: form.get('appointmentTime'),
        notes: form.get('notes'),
      }),
    });
    const data = await response.json();
    setMessage(
      response.ok
        ? 'Booking request sent. Track it in My Bookings.'
        : data.error || 'Unable to send booking.',
    );
    setSending(false);
  }
  if (loading)
    return (
      <main className="page-shell">
        <Link className="brand" href="/">
          <span aria-hidden>♛</span> CrownConnect
        </Link>
        <p>Loading stylist…</p>
      </main>
    );
  if (!details)
    return (
      <main className="page-shell">
        <Link className="brand" href="/">
          <span aria-hidden>♛</span> CrownConnect
        </Link>
        <p>{message || 'Seller not found.'}</p>
        <Link href="/marketplace">Back to marketplace</Link>
      </main>
    );
  const { seller, services, media } = details;
  return (
    <main className="page-shell">
      <div className="page-top">
        <Link className="brand" href="/">
          ♛ CrownConnect
        </Link>
        <Link href="/marketplace">Back to marketplace</Link>
      </div>
      <div className="panel-grid">
        <section>
          <p className="eyebrow">BOOK {seller.business_name.toUpperCase()}</p>
          <h1>Request your next appointment.</h1>
          <p>{seller.bio}</p>
          <div className="service-summary">
            <strong>{seller.featured_service}</strong>
            <p>
              From R{seller.service_price.toLocaleString('en-ZA')} ·{' '}
              {seller.city}
            </p>
          </div>
          {media.length > 0 && (
            <section className="customer-portfolio">
              <h2>Recent work</h2>
              <div className="portfolio-grid">
                {media.map((item) =>
                  item.media_type === 'image' ? (
                    <img
                      key={item.id}
                      src={item.url}
                      alt={`${seller.business_name}: ${item.file_name}`}
                    />
                  ) : (
                    <video key={item.id} controls>
                      <source src={item.url} type={item.content_type} />
                    </video>
                  ),
                )}
              </div>
            </section>
          )}
          <p>
            <strong>Available:</strong> {days.join(', ')}.
          </p>
        </section>
        <section className="panel">
          <h2>Choose a date and time</h2>
          {signedIn === false ? (
            <div className="notice">
              Please{' '}
              <Link href={`/sign-in?next=/book/${id}`}>sign in securely</Link>{' '}
              before booking.
            </div>
          ) : !account?.full_name || !account.phone ? (
            <div className="notice">
              Please <Link href="/account">complete your customer profile</Link>{' '}
              before booking.
            </div>
          ) : (
            <form className="form-grid" onSubmit={submit}>
              <div className="field full service-summary">
                <strong>Booking as {account.full_name}</strong>
                <p>
                  {account.phone} · <Link href="/account">Edit account</Link>
                </p>
              </div>
              <label className="field full">
                Service
                <select name="serviceId">
                  {services.length ? (
                    services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} · R
                        {service.price.toLocaleString('en-ZA')} ·{' '}
                        {service.duration_minutes} min
                      </option>
                    ))
                  ) : (
                    <option value="">{seller.featured_service}</option>
                  )}
                </select>
              </label>
              <label className="field">
                Preferred date
                <input
                  type="date"
                  min={today()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                Preferred time
                <select
                  name="appointmentTime"
                  required
                  disabled={!date || !available}
                >
                  <option value="">Choose a time</option>
                  {slots.map((time) => (
                    <option
                      key={time}
                      value={time}
                      disabled={taken.includes(time)}
                    >
                      {time}
                      {taken.includes(time) ? ' — requested' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {date && !available && (
                <p className="availability-warning">
                  This stylist is unavailable on {weekday}.
                </p>
              )}
              <label className="field full">
                Notes
                <textarea
                  name="notes"
                  maxLength={500}
                  placeholder="Style details or questions for the stylist"
                />
              </label>
              <button
                className="button"
                disabled={sending || !date || !available}
              >
                {sending ? 'Sending…' : 'Send booking request'}
              </button>
              {message && <p role="status">{message}</p>}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
