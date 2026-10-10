'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiUrl, awsApi, cognitoToken } from '@/app/aws-client';
import { googleMapsDirections, googleMapsSearch } from '@/app/google-maps';
import { PortalHeader } from '@/app/portal-header';

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
    [availableSlots, setAvailableSlots] = useState<string[]>([]),
    [availabilityReason, setAvailabilityReason] = useState(''),
    [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [message, setMessage] = useState(''),
    [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [step, setStep] = useState(1), [serviceId, setServiceId] = useState(''), [selectedTime, setSelectedTime] = useState(''), [includeProducts, setIncludeProducts] = useState(false), [payment, setPayment] = useState<'deposit'|'full'>('deposit');
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
  const available = !date || availableSlots.length > 0;

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
      if (!date) { setAvailableSlots([]); setAvailabilityReason(''); return; }
    }
    const query = new URLSearchParams({ sellerId: id, date });
    if (serviceId || details?.services[0]?.id) query.set('serviceId', serviceId || details?.services[0]?.id || '');
    void fetch(`${apiUrl}/availability?${query}`)
      .then((response) => response.json())
      .then((data) => { setAvailableSlots(data.slots ?? []); setAvailabilityReason(data.reason ?? ''); })
      .catch(() => { setAvailableSlots([]); setAvailabilityReason('Unable to load appointment times.'); });
  }, [id, date, serviceId, details?.services]);

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
      <>
        <PortalHeader portal="customer" />
        <main className="page-shell">
          <p>Loading stylist…</p>
        </main>
      </>
    );
  if (!details)
    return (
      <>
        <PortalHeader portal="customer" />
        <main className="page-shell">
          <p>{message || 'Stylist not found.'}</p>
          <Link href="/marketplace">Back to marketplace</Link>
        </main>
      </>
    );
  const { seller, services, media } = details;
  const selectedService = services.find(service => service.id === serviceId) ?? services[0];
  const stylingPrice = selectedService?.price ?? seller.service_price;
  const productPrice = includeProducts ? 269.97 : 0;
  const paymentAmount = payment === 'deposit' ? Math.max(100, Math.round(stylingPrice * .25)) : stylingPrice + productPrice;
  return (
    <>
      <PortalHeader portal="customer" />
      <main className="page-shell">
        <div className="page-top">
          <Link className="brand" href="/customer">
            ♛ Customer space
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
            <div className="map-actions">
              <a
                className="button ghost small"
                href={googleMapsSearch(
                  `${seller.business_name}, ${seller.city}, South Africa`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                View area on Google Maps
              </a>
              <a
                className="maps-link"
                href={googleMapsDirections(
                  `${seller.business_name}, ${seller.city}, South Africa`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Get directions ↗
              </a>
            </div>
          </section>
          <section className="panel">
            <h2>Book this look</h2>
            {signedIn === false ? (
              <div className="notice">
                Please{' '}
                <Link href={`/sign-in?portal=customer&next=/book/${id}`}>
                  sign in securely
                </Link>{' '}
                before booking.
              </div>
            ) : !account?.full_name || !account.phone ? (
              <div className="notice">
                Please{' '}
                <Link href="/account">complete your customer profile</Link>{' '}
                before booking.
              </div>
            ) : (
              <form className="booking-wizard" onSubmit={submit}>
                <div className="booking-progress">{['Style','Stylist','Date','Time','Products','Payment','Confirm'].map((label,index)=><button type="button" className={step >= index+1 ? 'active' : ''} onClick={()=>index+1 < step && setStep(index+1)} key={label}><span>{index+1}</span><small>{label}</small></button>)}</div>
                <div className="field full service-summary">
                  <strong>Booking as {account.full_name}</strong>
                  <p>
                    {account.phone} · <Link href="/account">Edit account</Link>
                  </p>
                </div>
                <input type="hidden" name="serviceId" value={serviceId || selectedService?.id || ''}/><input type="hidden" name="appointmentTime" value={selectedTime}/>
                {step === 1 && <section className="wizard-step"><p className="kicker">STEP 1</p><h3>Choose a hairstyle or service</h3><div className="choice-cards">{services.length ? services.map(service=><button type="button" className={(serviceId || services[0]?.id) === service.id ? 'selected' : ''} onClick={()=>setServiceId(service.id)} key={service.id}><span><strong>{service.name}</strong><small>{service.duration_minutes} minutes</small></span><b>R{service.price}</b></button>) : <button type="button" className="selected"><span><strong>{seller.featured_service}</strong><small>Stylist consultation included</small></span><b>R{seller.service_price}</b></button>}</div></section>}
                {step === 2 && <section className="wizard-step"><p className="kicker">STEP 2</p><h3>Your stylist</h3><div className="chosen-stylist"><span className="profile-avatar">♛</span><div><strong>{seller.business_name}</strong><p>★ 4.9 · {seller.city} · Verified professional</p></div></div><p className="muted">This look is connected to its original CrownConnect stylist.</p></section>}
                {step === 3 && <section className="wizard-step"><p className="kicker">STEP 3</p><h3>Choose your date</h3><input type="date" min={today()} value={date} onChange={event=>{setDate(event.target.value);setSelectedTime('')}} required/>{date&&!available&&<p className="availability-warning">This stylist is unavailable on {weekday}.</p>}<p className="muted">Available: {days.join(', ')}</p></section>}
                {step === 4 && <section className="wizard-step"><p className="kicker">STEP 4</p><h3>Choose an available time</h3>{availableSlots.length?<div className="time-slots">{availableSlots.map(time=><button type="button" className={selectedTime===time?'selected':''} onClick={()=>setSelectedTime(time)} key={time}>{time}</button>)}</div>:<div className="empty">{availabilityReason || 'No appointment slots remain on this date. Choose another date.'}</div>}</section>}
                {step === 5 && <section className="wizard-step"><p className="kicker">STEP 5</p><h3>Add the required hair</h3><label className={`product-choice ${includeProducts?'selected':''}`}><input type="checkbox" checked={includeProducts} onChange={event=>setIncludeProducts(event.target.checked)}/><span className="product-thumb cell-6"/><span><strong>3 × X-Pression Ultra Braid</strong><small>Recommended for this look</small></span><b>R269.97</b></label><button type="button" className="skip-link" onClick={()=>setIncludeProducts(false)}>I’ll bring my own hair</button></section>}
                {step === 6 && <section className="wizard-step"><p className="kicker">STEP 6</p><h3>Choose how to pay</h3><div className="payment-choices"><button type="button" className={payment==='deposit'?'selected':''} onClick={()=>setPayment('deposit')}><strong>Pay a deposit</strong><span>Secure the appointment now</span><b>R{Math.max(100,Math.round(stylingPrice*.25))}</b></button><button type="button" className={payment==='full'?'selected':''} onClick={()=>setPayment('full')}><strong>Pay in full</strong><span>Styling {includeProducts?'and products':''}</span><b>R{(stylingPrice+productPrice).toFixed(2)}</b></button></div></section>}
                {step === 7 && <section className="wizard-step"><p className="kicker">STEP 7</p><h3>Review and confirm</h3><div className="price-summary"><div><span>{selectedService?.name ?? seller.featured_service}</span><strong>R{stylingPrice.toFixed(2)}</strong></div>{includeProducts&&<div><span>Required hair products</span><strong>R{productPrice.toFixed(2)}</strong></div>}<div><span>Booking protection</span><strong>Included</strong></div><div className="total"><span>Due now ({payment})</span><strong>R{paymentAmount.toFixed(2)}</strong></div></div><label>Notes for your stylist<textarea name="notes" maxLength={500} placeholder="Anything your stylist should know?"/></label><button className="cc-button full" disabled={sending}>{sending?'Confirming…':'Confirm booking request'}</button></section>}
                <div className="wizard-nav">{step>1&&<button type="button" className="cc-button outline" onClick={()=>setStep(step-1)}>Back</button>}{step<7&&<button type="button" className="cc-button" disabled={(step===3&&(!date||!available))||(step===4&&!selectedTime)} onClick={()=>setStep(step+1)}>Continue</button>}</div>
                {message && <p role="status">{message}</p>}
              </form>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
