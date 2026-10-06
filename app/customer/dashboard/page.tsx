'use client';

import Link from 'next/link';
import { CalendarDays, Heart, MessageCircle, Package, Settings, ShoppingBag, Star, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { awsApi, cognitoToken } from '../../aws-client';
import { PortalHeader } from '../../portal-header';
import { EditorialImage, HairstyleCard } from '../../marketplace-components';
import { looks } from '../../marketplace-data';

type Booking = { id:string; business_name:string; service_name:string; appointment_date:string; appointment_time:string; city:string; status:string };
export default function CustomerDashboard() {
  const [bookings,setBookings]=useState<Booking[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{void (async()=>{if(!(await cognitoToken())){window.location.href='/sign-in?portal=customer&next=/customer/dashboard';return}const response=await awsApi('/bookings');if(response.ok)setBookings((await response.json()).bookings??[]);setLoading(false)})()},[]);
  const next=bookings.find(item=>['pending','confirmed'].includes(item.status));
  return <><PortalHeader portal="customer"/><main className="customer-dashboard"><aside className="dashboard-sidebar"><h3>My CrownConnect</h3><nav><Link className="active" href="/customer/dashboard"><UserRound/> Overview</Link><Link href="/my-bookings"><CalendarDays/> Bookings</Link><Link href="#orders"><Package/> Orders</Link><Link href="#saved"><Heart/> Saved hairstyles</Link><Link href="/stylists"><Star/> Favourite stylists</Link><Link href="#messages"><MessageCircle/> Messages</Link><Link href="/account"><Settings/> Profile settings</Link></nav></aside><section className="dashboard-content"><header><p className="kicker">CUSTOMER DASHBOARD</p><h1>Your beauty space.</h1><p>Bookings, orders and inspiration—all together.</p></header><div className="dashboard-stats"><article><CalendarDays/><span><strong>{bookings.length}</strong>Bookings</span></article><article><ShoppingBag/><span><strong>1</strong>Active order</span></article><article><Heart/><span><strong>5</strong>Saved looks</span></article></div><section className="dashboard-section"><div className="cc-section-title"><h2>Upcoming booking</h2><Link href="/my-bookings">View all →</Link></div>{loading?<div className="skeleton dashboard-skeleton"/>:next?<article className="upcoming-card"><EditorialImage cell={1}/><div><span className={`status ${next.status}`}>{next.status}</span><h3>{next.service_name}</h3><p>{next.business_name}</p><strong>{next.appointment_date} · {next.appointment_time}</strong><small>{next.city}</small></div><div><button className="cc-button outline">Get directions</button><Link className="cc-button" href="/my-bookings">Manage</Link></div></article>:<div className="empty"><h3>No upcoming appointments</h3><p>Find a look and book a stylist you love.</p><Link className="cc-button" href="/discover">Explore hairstyles</Link></div>}</section><section className="dashboard-section" id="saved"><div className="cc-section-title"><h2>Saved for you</h2><Link href="/discover">Discover more →</Link></div><div className="look-grid">{looks.slice(0,3).map(look=><HairstyleCard key={look.slug} look={look}/>)}</div></section></section></main></>;
}
