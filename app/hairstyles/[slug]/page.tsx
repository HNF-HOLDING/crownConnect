import Link from 'next/link';
import { Clock, MapPin, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PortalHeader } from '../../portal-header';
import { EditorialImage, ProductCard, Rating } from '../../marketplace-components';
import { looks, products } from '../../marketplace-data';

export function generateStaticParams() { return looks.map(({ slug }) => ({ slug })); }

export default async function HairstylePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const look = looks.find(item => item.slug === slug); if (!look) notFound();
  return <><PortalHeader portal="customer"/><main className="cc-market detail-page"><div className="detail-gallery"><div className="detail-thumbs">{[look.cell, (look.cell+1)%6, (look.cell+2)%6].map((cell,i)=><EditorialImage key={i} cell={cell}/>)}</div><EditorialImage cell={look.cell} className="detail-main"/></div><section className="detail-copy"><p className="kicker">FEATURED LOOK</p><h1>{look.name}</h1><Rating value={look.rating} count={127}/><p className="detail-price">R{look.price} <small>styling</small></p><div className="detail-facts"><span><Clock/> {look.duration}</span><span><MapPin/> {look.location}</span><span><ShieldCheck/> Verified stylist</span></div><p>Lightweight, polished and made to last. Your stylist will personalise the length, finish and parting during your consultation.</p><div className="stylist-inline"><span className={`mini-avatar cell-${look.cell}`}/><div><small>CREATED BY</small><strong>{look.stylist}</strong><Rating value={look.rating}/></div><Link href="/stylists/1">View profile</Link></div><div className="required-list"><h3>Hair/products required</h3><p>3 × pre-stretched braid packs · Curling hair · Edge control</p></div><div className="detail-actions"><Link className="cc-button" href="/shop/xpression-braid">Buy hair & products</Link><Link className="cc-button outline" href={`/book/1?look=${look.slug}`}>Book this hairstyle</Link><Link className="cc-button dark" href={`/book/1?look=${look.slug}&products=1`}>Buy products + book stylist</Link></div></section><section className="detail-products"><h2>Complete the look</h2><div className="product-grid">{products.slice(0,3).map(product=><ProductCard key={product.id} product={product}/>)}</div></section></main></>;
}
