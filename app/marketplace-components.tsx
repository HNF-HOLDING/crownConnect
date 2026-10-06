'use client';

import Link from 'next/link';
import { Heart, MapPin, Play, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import { looks, products, stylists } from './marketplace-data';

export function EditorialImage({ cell, className = '' }: { cell: number; className?: string }) {
  return <div className={`editorial-image cell-${cell} ${className}`} aria-label="CrownConnect hairstyle inspiration" />;
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return <span className="cc-rating"><Star size={13} fill="currentColor"/> {value}{count ? ` (${count})` : ''}</span>;
}

export function SearchBar({ compact = false }: { compact?: boolean }) {
  return <form className={`cc-search ${compact ? 'compact' : ''}`} action="/discover"><span>⌕</span><input name="q" aria-label="Search CrownConnect" placeholder="Search hairstyles, wigs, products or stylists…"/><button type="submit">Search</button></form>;
}

export function HairstyleCard({ look = looks[0] }: { look?: (typeof looks)[number] }) {
  const [saved, setSaved] = useState(false);
  return <article className="look-card"><Link className="look-image" href={`/hairstyles/${look.slug}`}><EditorialImage cell={look.cell}/><span className="video-chip"><Play size={13} fill="currentColor"/> Look</span></Link><button className={`save-button ${saved ? 'saved' : ''}`} onClick={() => setSaved(!saved)} aria-label="Save hairstyle"><Heart size={18} fill={saved ? 'currentColor' : 'none'}/></button><div className="look-copy"><div className="look-stylist"><span className={`mini-avatar cell-${look.cell}`}/><div><strong>{look.stylist}</strong><small><MapPin size={11}/> {look.location}</small></div></div><Link href={`/hairstyles/${look.slug}`}><h3>{look.name}</h3></Link><div className="look-meta"><strong>R{look.price}</strong><span>♡ {look.likes}</span></div><Link className="cc-button full" href={`/book/1?look=${look.slug}`}>Book this look</Link></div></article>;
}

export function ProductCard({ product = products[0] }: { product?: (typeof products)[number] }) {
  const [added, setAdded] = useState(false);
  return <article className="product-card"><Link href={`/shop/${product.id}`}><EditorialImage cell={product.cell}/></Link><small>{product.category}</small><Link href={`/shop/${product.id}`}><h3>{product.name}</h3></Link><Rating value={product.rating}/><div className="product-buy"><strong>R{product.price.toFixed(2)}</strong><button onClick={() => setAdded(true)} aria-label={`Add ${product.name} to cart`}><ShoppingBag size={17}/>{added ? 'Added' : 'Add'}</button></div></article>;
}

export function StylistCard({ stylist = stylists[0] }: { stylist?: (typeof stylists)[number] }) {
  return <article className="stylist-card"><EditorialImage cell={stylist.cell}/><div><div className="stylist-title"><Link href={`/stylists/${stylist.id}`}><h3>{stylist.name}</h3></Link><Rating value={stylist.rating} count={stylist.reviews}/></div><p><MapPin size={14}/> {stylist.location} · {stylist.distance}</p><small>{stylist.specialties}</small><div className="stylist-bottom"><span>From <strong>R{stylist.price}</strong></span><Link className="cc-button small" href={`/stylists/${stylist.id}`}>View profile</Link></div></div></article>;
}

export function SectionTitle({ eyebrow, title, href, link = 'View all' }: { eyebrow?: string; title: string; href?: string; link?: string }) {
  return <div className="cc-section-title"><div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2></div>{href && <Link href={href}>{link} →</Link>}</div>;
}
