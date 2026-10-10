import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { PortalHeader } from '../portal-header';
import { EditorialImage, HairstyleCard, ProductCard, SearchBar, SectionTitle, StylistCard } from '../marketplace-components';
import { categories, looks, products, stylists } from '../marketplace-data';

export default function CustomerHome() {
  return <><PortalHeader portal="customer"/><main className="cc-market">
    <section className="cc-hero"><div className="hero-copy"><p className="kicker">YOUR HAIR. YOUR STYLE. YOUR COMMUNITY.</p><h1>Find the look.<br/><em>Book the artist.</em></h1><p>Discover hairstyles, shop the hair and products, then book a trusted stylist near you—all in one place.</p><SearchBar/><div className="location-note"><MapPin size={15}/> Showing beauty professionals near Pretoria</div></div><EditorialImage cell={0} className="hero-editorial"/></section>
    <div className="category-strip">{categories.map((category, index) => <Link href={category === 'Find a stylist' ? '/stylists' : `/discover?category=${encodeURIComponent(category)}`} key={category}><span className={`category-image cell-${index % 8}`}/><small>{category}</small></Link>)}</div>
    <section><SectionTitle eyebrow="TRENDING NOW" title="Looks everyone is saving" href="/discover"/><div className="look-grid">{looks.slice(0,4).map(look => <HairstyleCard key={look.slug} look={look}/>)}</div></section>
    <section><SectionTitle eyebrow="NEAR YOU" title="Recommended stylists" href="/stylists"/><div className="stylist-home-grid">{stylists.slice(0,3).map(stylist => <StylistCard key={stylist.id} stylist={stylist}/>)}</div></section>
    <section><SectionTitle eyebrow="SHOP THE LOOK" title="Hair and care, delivered" href="/shop"/><div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product}/>)}</div></section>
    <section className="cc-promo"><EditorialImage cell={1}/><div><p className="kicker">ONE EASY JOURNEY</p><h2>See it. Shop it. Book it.</h2><p>Every featured style connects you to the creator, the products used and their next available appointment.</p><Link className="cc-button" href="/discover">Start discovering</Link></div></section>
  </main></>;
}
