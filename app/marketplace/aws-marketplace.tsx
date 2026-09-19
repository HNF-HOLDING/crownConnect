'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiUrl } from '../aws-client';
type Seller={id:string;business_name:string;city:string;specialty:string;featured_service:string;service_price:number;bio:string};
const api=apiUrl;
export function AwsMarketplace(){const [s,setS]=useState<Seller[]>([]);const [loading,setLoading]=useState(true);useEffect(()=>{fetch(`${api}/sellers`).then(r=>r.json()).then(d=>setS(d.sellers??[])).finally(()=>setLoading(false))},[]);return <main className="marketplace-page"><section className="marketplace-intro"><p className="eyebrow">BOOK LOCAL TALENT</p><h1>A stylist for your style.</h1><p>Discover professionals using the CrownConnect AWS marketplace.</p></section><p className="market-count">{loading?'Loading stylists…':`${s.length} ${s.length===1?'stylist':'stylists'} found`}</p><div className="grid">{s.map(x=><article className="card live-card" key={x.id}><div className="service-art"><span>{x.specialty}</span><strong>{x.business_name.slice(0,1)}</strong></div><p className="badge">{x.specialty}</p><h3>{x.featured_service}</h3><p>{x.business_name}</p><p>⌖ {x.city}</p><p className="card-bio">{x.bio}</p><div className="card-footer"><strong>From R{x.service_price.toLocaleString('en-ZA')}</strong><Link href={`/book/${x.id}`}>View & request ↗</Link></div></article>)}</div></main>}
