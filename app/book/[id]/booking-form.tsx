'use client';

import { useEffect, useMemo, useState } from 'react';

type Service = { id: number; name: string; price: number; duration_minutes: number; description: string };
const slots = ['09:00', '11:00', '13:00', '15:00'];

export function BookingForm({ sellerId, availableDays, services, fallbackService, fallbackPrice, defaultName, email, minimumDate }: { sellerId: number; availableDays: string[]; services: Service[]; fallbackService: string; fallbackPrice: number; defaultName: string; email: string; minimumDate: string }) {
  const [date, setDate] = useState(''), [taken, setTaken] = useState<string[]>([]), [loading, setLoading] = useState(false);
  const weekday = useMemo(() => date ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${date}T12:00:00Z`).getUTCDay()] : '', [date]);
  const available = !date || availableDays.includes(weekday);
  useEffect(() => { if (!date || !available) { setTaken([]); return; } setLoading(true); fetch(`/api/bookings/slots?sellerId=${sellerId}&date=${date}`).then((response) => response.ok ? response.json() : { takenTimes: [] }).then((data: unknown) => setTaken((data as { takenTimes?: string[] }).takenTimes ?? [])).finally(() => setLoading(false)); }, [sellerId, date, available]);
  return <form action="/api/bookings" method="post" className="form-grid">
    <input type="hidden" name="sellerId" value={sellerId} />
    <div className="field full"><label htmlFor="serviceId">Service</label><select id="serviceId" name="serviceId" defaultValue="">{services.length ? services.map((service) => <option value={service.id} key={service.id}>{service.name} · R{service.price.toLocaleString('en-ZA')} · {service.duration_minutes} min</option>) : <option value="">{fallbackService} · From R{fallbackPrice.toLocaleString('en-ZA')}</option>}</select></div>
    <div className="field full"><label htmlFor="customerName">Your name</label><input id="customerName" name="customerName" required maxLength={80} defaultValue={defaultName} /></div>
    <div className="field full"><label htmlFor="customerPhone">WhatsApp or phone</label><input id="customerPhone" name="customerPhone" type="tel" required maxLength={30} /></div>
    <div className="field"><label htmlFor="appointmentDate">Preferred date</label><input id="appointmentDate" name="appointmentDate" type="date" min={minimumDate} required value={date} onChange={(event) => setDate(event.target.value)} /></div>
    <div className="field"><label htmlFor="appointmentTime">Preferred time</label><select id="appointmentTime" name="appointmentTime" disabled={!date || !available || loading} required><option value="">{loading ? 'Checking times…' : !date ? 'Choose a date' : !available ? 'Unavailable day' : 'Choose a time'}</option>{slots.map((time) => <option disabled={taken.includes(time)} value={time} key={time}>{time}{taken.includes(time) ? ' — requested' : ''}</option>)}</select></div>
    {date && !available && <p className="availability-warning" role="status">This stylist does not accept bookings on {weekday}. Choose another day.</p>}
    {date && available && taken.length === slots.length && <p className="availability-warning" role="status">All appointment times are taken on this date. Choose another day.</p>}
    <div className="field full"><label htmlFor="notes">Notes for the stylist (optional)</label><textarea id="notes" name="notes" maxLength={500} placeholder="Hair length, colour, or anything they should know." /></div>
    <div className="form-actions"><span className="muted">Updates go to {email}</span><button className="button" type="submit" disabled={!date || !available || loading || taken.length === slots.length}>Send booking request</button></div>
  </form>;
}
