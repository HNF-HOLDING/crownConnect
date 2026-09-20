import Link from 'next/link';
import { SiteHeader } from '../site-header';
const categories = [
  {
    name: 'Braiding hair',
    description: 'Extensions and packs for your next braid installation.',
    tone: 'braids',
  },
  {
    name: 'Wigs & closures',
    description: 'Everyday wigs, lace closures, and frontal pieces.',
    tone: 'wigs',
  },
  {
    name: 'Bundles & weaves',
    description: 'Straight, body wave, and curly bundle textures.',
    tone: 'bundles',
  },
  {
    name: 'Care & accessories',
    description: 'Edge control, bonnets, combs, and everyday essentials.',
    tone: 'care',
  },
];
export default function ProductsPage() {
  return (
    <>
      <SiteHeader />
      <main className="products-page">
        <section className="products-intro">
          <p className="eyebrow">HAIR PRODUCTS</p>
          <h1>Shop your hair essentials.</h1>
          <p>Product sellers will appear here as they join CrownConnect.</p>
        </section>
        <section className="product-category-grid">
          {categories.map((category) => (
            <article
              className={`product-category ${category.tone}`}
              key={category.name}
            >
              <div className="product-mark">✦</div>
              <p className="eyebrow">SHOP CATEGORY</p>
              <h2>{category.name}</h2>
              <p>{category.description}</p>
              <span>Seller products coming soon</span>
            </article>
          ))}
        </section>
        <section className="products-callout">
          <div>
            <p className="eyebrow">LOOKING FOR A SERVICE?</p>
            <h2>Book the right stylist for your look.</h2>
          </div>
          <Link className="button" href="/marketplace">
            Find a stylist
          </Link>
        </section>
      </main>
    </>
  );
}
