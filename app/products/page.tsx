import Link from 'next/link';
import { PortalHeader } from '../portal-header';
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
      <PortalHeader portal="customer" />
      <main className="products-page">
        <section className="products-intro">
          <p className="eyebrow">HAIR PRODUCTS</p>
          <h1>Shop the essentials your hair routine needs.</h1>
          <p>
            Explore the products customers look for most, from protective styles
            to everyday haircare and finishing essentials.
          </p>
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
              <span>Products coming soon</span>
            </article>
          ))}
        </section>
        <section className="products-callout">
          <div>
            <p className="eyebrow">LOOKING FOR A SERVICE?</p>
            <h2>Book the right stylist for your look.</h2>
          </div>
          <div className="products-actions">
            <Link className="button" href="/marketplace">
              Book a stylist
            </Link>
            <Link className="button secondary" href="/customer">
              Customer home
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
