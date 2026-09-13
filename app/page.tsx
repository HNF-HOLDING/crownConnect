import Image from 'next/image';
import Link from 'next/link';
import { getChatGPTUser } from './chatgpt-auth';
import { listSellerCities, listSellers } from '@/db/queries';

export const dynamic = 'force-dynamic';

const samples = [
  { title: 'Knotless braids', business: 'Diplomatic Hair Salon', city: 'KaMaporo', price: 350, position: '76% 40%' },
  { title: 'Tribal goddess braids', business: 'Diplomatic Hair Salon', city: 'KaMaporo', price: 400, position: '10% 68%' },
  { title: 'Goddess braids', business: 'Diplomatic Hair Salon', city: 'KaMaporo', price: 480, position: '49% 68%' },
  { title: 'Short boho braids', business: 'Diplomatic Hair Salon', city: 'KaMaporo', price: 350, position: '90% 68%' },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; specialty?: string; maxPrice?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 80) ?? '', city = params.city?.trim().slice(0, 80) ?? '', specialty = params.specialty?.trim().slice(0, 40) ?? '', maxPrice = Number(params.maxPrice) || undefined;
  const [user, sellers, cities] = await Promise.all([getChatGPTUser(), listSellers({ q, city, specialty, maxPrice }), listSellerCities()]);
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/"><span aria-hidden>♛</span> CrownConnect</a>
        <nav aria-label="Primary navigation"><a href="#stylists">Find a stylist</a><Link href="/my-bookings">My bookings</Link><Link href="/seller">Seller studio</Link></nav>
        <Link className="button secondary" href="/seller">{user ? 'Open seller studio' : 'List your business'} ↗</Link>
      </header>
      <main>
        <section className="hero">
          <div><p className="eyebrow">YOUR HAIR. YOUR PEOPLE.</p><h1>Your next good<br />hair day starts here.</h1><p>Discover independent stylists and request an appointment directly.</p></div>
          <div className="hero-note"><span>Made for your crown.</span><p>Local talent.<br />Real booking requests.</p></div>
        </section>
        <section id="stylists" className="marketplace" aria-labelledby="market-heading">
          <div className="section-heading"><div><p className="eyebrow">BOOK LOCAL TALENT</p><h2 id="market-heading">A stylist for your style</h2></div><span>{sellers.length ? `${sellers.length} matching ${sellers.length === 1 ? 'stylist' : 'stylists'}` : 'Refine your search'}</span></div>
          <form className="market-filters" action="/" method="get" aria-label="Find a stylist">
            <label className="filter-search"><span>Search</span><input name="q" defaultValue={q} placeholder="Service or business" /></label>
            <label><span>Location</span><select name="city" defaultValue={city}><option value="">All locations</option>{cities.map((place) => <option key={place}>{place}</option>)}</select></label>
            <label><span>Specialty</span><select name="specialty" defaultValue={specialty}><option value="">All specialties</option><option>Braids</option><option>Wigs</option><option>Weaves</option><option>Natural hair</option><option>Haircare</option></select></label>
            <label><span>Budget</span><select name="maxPrice" defaultValue={maxPrice ? String(maxPrice) : ''}><option value="">Any price</option><option value="300">Up to R300</option><option value="500">Up to R500</option><option value="800">Up to R800</option><option value="1200">Up to R1,200</option></select></label>
            <button className="button small" type="submit">Search</button>{(q || city || specialty || maxPrice) && <Link className="clear-link" href="/#stylists">Clear</Link>}
          </form>
          <div className="grid">
            {sellers.map((seller) => (
              <article className="card live-card" key={seller.id}>
                <div className="service-art"><span>{seller.specialty}</span><strong>{seller.business_name.slice(0, 1)}</strong></div>
                <p className="badge">{seller.specialty}</p><h3>{seller.featured_service}</h3><p>{seller.business_name}</p><p>⌖ {seller.city}</p><p className="card-bio">{seller.bio}</p>
                <div className="card-footer"><strong>From R{seller.service_price.toLocaleString('en-ZA')}</strong><Link href={`/book/${seller.id}`}>View & request ↗</Link></div>
              </article>
            ))}
            {!sellers.length && !q && !city && !specialty && !maxPrice && samples.map((service) => (
              <article className="card" key={service.title}>
                <div className="photo"><Image src="/salon.jpeg" alt="Hairstyles from the Diplomatic Hair Salon reference flyer" fill sizes="(max-width: 700px) 50vw, 25vw" style={{ objectFit: 'cover', objectPosition: service.position }} /><span className="badge">Sample</span></div>
                <h3>{service.title}</h3><p>{service.business}</p><p>⌖ {service.city}</p>
                <div className="card-footer"><strong>R{service.price}</strong><span className="muted">Profile not live yet</span></div>
              </article>
            ))}{!sellers.length && (q || city || specialty || maxPrice) && <div className="empty filter-empty">No stylists match those filters yet. Try widening your search.</div>}
          </div>
        </section>
      </main>
      <footer><a className="brand" href="/">♛ CrownConnect</a><p>Hair, care & community.</p><span>South Africa · ZAR</span></footer>
    </>
  );
}
