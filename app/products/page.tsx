import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findAccountProfile } from '@/db/queries';
import { AccountMenu } from '@/app/account-menu';
import { LandingNavLink } from '@/app/landing-nav-link';

export const dynamic = 'force-dynamic';

const categories = [
  { name: 'Braiding hair', description: 'Extensions and packs for your next braid installation.', tone: 'braids' },
  { name: 'Wigs & closures', description: 'Everyday wigs, lace closures, and frontal pieces.', tone: 'wigs' },
  { name: 'Bundles & weaves', description: 'Straight, body wave, and curly bundle textures.', tone: 'bundles' },
  { name: 'Care & accessories', description: 'Edge control, bonnets, combs, and everyday essentials.', tone: 'care' },
];

export default async function ProductsPage() {
  const user = await getChatGPTUser();
  const account = user ? await findAccountProfile(user.userId) : null;

  return <>
    <header className="site-header"><a className="brand" href="/"><span aria-hidden>♛</span> CrownConnect</a><nav aria-label="Primary navigation"><a href="/marketplace">Find a stylist</a><a href="/products">Hair products</a></nav>{user ? <AccountMenu role={account?.primary_role} name={user.fullName ?? user.email} /> : <LandingNavLink className="button secondary" href="/welcome">Create account</LandingNavLink>}</header>
    <main className="products-page">
      <section className="products-intro"><p className="eyebrow">HAIR PRODUCTS</p><h1>Shop your hair essentials.</h1><p>Explore product categories for your next install, protective style, and care routine. Product sellers will appear here as they join CrownConnect.</p></section>
      <section className="product-category-grid" aria-label="Hair product categories">{categories.map((category) => <article className={`product-category ${category.tone}`} key={category.name}><div className="product-mark" aria-hidden>✦</div><p className="eyebrow">SHOP CATEGORY</p><h2>{category.name}</h2><p>{category.description}</p><span>Seller products coming soon</span></article>)}</section>
      <section className="products-callout"><div><p className="eyebrow">LOOKING FOR A SERVICE?</p><h2>Book the right stylist for your look.</h2><p>Find local professionals, compare their services, and send a booking request.</p></div><LandingNavLink className="button" href="/marketplace">Find a stylist</LandingNavLink></section>
    </main>
    <footer><a className="brand" href="/">♛ CrownConnect</a><p>Hair, care & community.</p><span>South Africa · ZAR</span></footer>
  </>;
}
