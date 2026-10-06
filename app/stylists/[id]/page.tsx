import Link from 'next/link';
import { BadgeCheck, MapPin, MessageCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PortalHeader } from '../../portal-header';
import { EditorialImage, Rating } from '../../marketplace-components';
import { looks, stylists } from '../../marketplace-data';

export function generateStaticParams() { return stylists.map(({ id }) => ({ id: String(id) })); }

export default async function StylistProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const stylist = stylists.find(item => item.id === Number(id)); if (!stylist) notFound();
  return <><PortalHeader portal="customer"/><main className="stylist-profile"><div className="profile-cover"><EditorialImage cell={(stylist.cell+1)%6}/><EditorialImage cell={stylist.cell}/></div><section className="profile-overview"><div className={`profile-photo cell-${stylist.cell}`}/><div className="profile-identity"><h1>{stylist.name} <BadgeCheck/></h1><Rating value={stylist.rating} count={stylist.reviews}/><p><MapPin/> {stylist.location} · {stylist.distance} away</p><small>248 completed bookings</small></div><div className="profile-actions"><Link className="cc-button" href={`/book/${stylist.id}`}>Book stylist</Link><button className="cc-button outline"><MessageCircle/> Message</button></div></section><p className="profile-bio">Professional hair artist specialising in {stylist.specialties.toLowerCase()}. Healthy hair, beautiful finishes and a relaxed appointment every time.</p><nav className="profile-tabs"><a className="active" href="#portfolio">Portfolio</a><a href="#services">Services</a><a href="#reviews">Reviews</a><a href="#about">About</a></nav><section id="portfolio" className="profile-portfolio">{looks.map(look=><Link key={look.slug} href={`/hairstyles/${look.slug}`}><EditorialImage cell={look.cell}/><span><strong>{look.name}</strong><small>R{look.price} · Book this look</small></span></Link>)}</section><section id="services" className="service-list"><h2>Services</h2>{looks.slice(0,3).map(look=><div key={look.slug}><div><strong>{look.name}</strong><p>{look.duration} · Consultation included</p></div><span>R{look.price}</span><Link className="cc-button small" href={`/book/${stylist.id}?look=${look.slug}`}>Book</Link></div>)}</section></main></>;
}
