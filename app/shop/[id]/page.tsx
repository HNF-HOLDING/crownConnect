import { Minus, Plus, ShieldCheck, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PortalHeader } from '../../portal-header';
import { EditorialImage, HairstyleCard, Rating } from '../../marketplace-components';
import { looks, products } from '../../marketplace-data';

export function generateStaticParams() { return products.map(({ id }) => ({ id })); }
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const product = products.find(item => item.id === id); if (!product) notFound();
  return <><PortalHeader portal="customer"/><main className="cc-market product-detail"><EditorialImage cell={product.cell} className="product-main"/><section><p className="breadcrumbs">Shop / {product.category}</p><h1>{product.name}</h1><Rating value={product.rating} count={320}/><p className="detail-price">R{product.price.toFixed(2)}</p><p>Salon-quality performance selected by CrownConnect professionals. Built for beautiful, reliable results.</p><div className="shade-row"><span/><span/><span/><span/><span/></div><div className="quantity-row"><button><Minus/></button><strong>1</strong><button><Plus/></button><button className="cc-button">Add to cart</button></div><div className="product-assurance"><span><Truck/> Delivery available</span><span><ShieldCheck/> Secure payment</span></div></section><section className="using-product"><h2>Hairstyles using this product</h2><div className="look-grid">{looks.slice(0,4).map(look=><HairstyleCard key={look.slug} look={look}/>)}</div></section></main></>;
}
