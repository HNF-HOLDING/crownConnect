import Link from 'next/link';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findAccountProfile, listSellerCities, listSellers } from '@/db/queries';
import { AccountMenu } from '@/app/account-menu';

export const dynamic = 'force-dynamic';

export default async function Marketplace({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; specialty?: string; maxPrice?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 80) ?? '', city = params.city?.trim().slice(0, 80) ?? '', specialty = params.specialty?.trim().slice(0, 40) ?? '', maxPrice = Number(params.maxPrice) || undefined;
  const user = await getChatGPTUser();
  const [account, sellers, cities] = await Promise.all([user ? findAccountProfile(user.userId) : Promise.resolve(null), listSellers({ q, city, specialty, maxPrice }), listSellerCities()]);
  return <>
    <header className="site-header"><a className="brand" href="/"><span aria-hidden>♛</span> CrownConnect</a><nav aria-label="Primary navigation"><Link href="/">About CrownConnect</Link><Link href="/marketplace">Find a stylist</Link><Link href="/products">Hair products</Link></nav>{user ? <AccountMenu role={account?.primary_role} name={user.fullName ?? user.email} /> : <Link className="button secondary" href="/register">Create account</Link>}</header>
    <main className="marketplace-page"><section className="marketplace-intro"><p className="eyebrow">BOOK LOCAL TALENT</p><h1>A stylist for your style.</h1><p>Search independent professionals and send a booking request when you find the right fit.</p></section>
      <form className="market-filters" action="/marketplace" method="get" aria-label="Find a stylist"><label className="filter-search"><span>Search</span><input name="q" defaultValue={q} placeholder="Service or business" /></label><label><span>Location</span><select name="city" defaultValue={city}><option value="">All locations</option>{cities.map((place) => <option key={place}>{place}</option>)}</select></label><label><span>Specialty</span><select name="specialty" defaultValue={specialty}><option value="">All specialties</option><option>Braids</option><option>Wigs</option><option>Weaves</option><option>Natural hair</option><option>Haircare</option></select></label><label><span>Budget</span><select name="maxPrice" defaultValue={maxPrice ? String(maxPrice) : ''}><option value="">Any price</option><option value="300">Up to R300</option><option value="500">Up to R500</option><option value="800">Up to R800</option><option value="1200">Up to R1,200</option></select></label><button className="button small" type="submit">Search</button>{(q || city || specialty || maxPrice) && <Link className="clear-link" href="/marketplace">Clear</Link>}</form>
      <p className="market-count">{sellers.length ? `${sellers.length} ${sellers.length === 1 ? 'stylist' : 'stylists'} found` : 'No stylists found'}</p><div className="grid">{sellers.map((seller) => <article className="card live-card" key={seller.id}>{seller.cover_media_id ? <div className="market-cover"><img src={`/api/media/${seller.cover_media_id}`} alt={`${seller.business_name} hairstyle portfolio`} /></div> : <div className="service-art"><span>{seller.specialty}</span><strong>{seller.business_name.slice(0, 1)}</strong></div>}<p className="badge">{seller.specialty}</p><h3>{seller.featured_service}</h3><p>{seller.business_name}</p><p>⌖ {seller.city}</p><p className="card-bio">{seller.bio}</p><div className="card-footer"><strong>From R{seller.service_price.toLocaleString('en-ZA')}</strong><Link href={`/book/${seller.id}`}>View & request ↗</Link></div></article>)}{!sellers.length && <div className="empty filter-empty">No stylists match those filters yet. Try a wider search soon.</div>}</div>
    </main><footer><a className="brand" href="/">♛ CrownConnect</a><p>Hair, care & community.</p><span>South Africa · ZAR</span></footer>
  </>;
}
