import Image from 'next/image';
import Link from 'next/link';
import { getChatGPTUser } from './chatgpt-auth';
import { listSellers } from '@/db/queries';

export const dynamic = 'force-dynamic';

const samples = [
  { title: 'Knotless braids', business: 'Diplomatic Hair Salon', city: 'KaMaporo', price: 350, position: '76% 40%' },
  { title: 'Tribal goddess braids', business: 'Diplomatic Hair Salon', city: 'KaMaporo', price: 400, position: '10% 68%' },
  { title: 'Goddess braids', business: 'Diplomatic Hair Salon', city: 'KaMaporo', price: 480, position: '49% 68%' },
  { title: 'Short boho braids', business: 'Diplomatic Hair Salon', city: 'KaMaporo', price: 350, position: '90% 68%' },
];

export default async function Home() {
  const [user, sellers] = await Promise.all([getChatGPTUser(), listSellers()]);
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/"><span aria-hidden>♛</span> CrownConnect</Link>
        <nav aria-label="Primary navigation"><a href="#stylists">Find a stylist</a><Link href="/seller">Seller studio</Link></nav>
        <Link className="button secondary" href="/seller">{user ? 'Open seller studio' : 'List your business'} ↗</Link>
      </header>
      <main>
        <section className="hero">
          <div><p className="eyebrow">YOUR HAIR. YOUR PEOPLE.</p><h1>Your next good<br />hair day starts here.</h1><p>Discover independent stylists and request an appointment directly.</p></div>
          <div className="hero-note"><span>Made for your crown.</span><p>Local talent.<br />Real booking requests.</p></div>
        </section>
        <section id="stylists" className="marketplace" aria-labelledby="market-heading">
          <div className="section-heading"><div><p className="eyebrow">BOOK LOCAL TALENT</p><h2 id="market-heading">A stylist for your style</h2></div><span>{sellers.length ? `${sellers.length} live ${sellers.length === 1 ? 'stylist' : 'stylists'}` : 'New stylists coming soon'}</span></div>
          <div className="grid">
            {sellers.map((seller) => (
              <article className="card live-card" key={seller.id}>
                <div className="service-art"><span>{seller.specialty}</span><strong>{seller.business_name.slice(0, 1)}</strong></div>
                <p className="badge">Live profile</p><h3>{seller.featured_service}</h3><p>{seller.business_name}</p><p>⌖ {seller.city}</p>
                <div className="card-footer"><strong>R{seller.service_price.toLocaleString('en-ZA')}</strong><Link href={`/book/${seller.id}`}>Request booking ↗</Link></div>
              </article>
            ))}
            {!sellers.length && samples.map((service) => (
              <article className="card" key={service.title}>
                <div className="photo"><Image src="/salon.jpeg" alt="Hairstyles from the Diplomatic Hair Salon reference flyer" fill sizes="(max-width: 700px) 50vw, 25vw" style={{ objectFit: 'cover', objectPosition: service.position }} /><span className="badge">Sample</span></div>
                <h3>{service.title}</h3><p>{service.business}</p><p>⌖ {service.city}</p>
                <div className="card-footer"><strong>R{service.price}</strong><span className="muted">Profile not live yet</span></div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer><Link className="brand" href="/">♛ CrownConnect</Link><p>Hair, care & community.</p><span>South Africa · ZAR</span></footer>
    </>
  );
}
