import { PortalHeader } from '../portal-header';
import { ShopSearch } from '../live-marketplace-search';

export default function ShopPage() {
  return <><PortalHeader portal="customer"/><main className="cc-market shop-page"><header className="shop-hero"><div><p className="kicker">CROWNCONNECT SHOP</p><h1>Everything for the look.</h1><p>Shop trusted hair, wigs, extensions and salon-grade care selected by working stylists.</p></div></header><ShopSearch/></main></>;
}
