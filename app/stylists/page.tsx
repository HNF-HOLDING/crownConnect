import { PortalHeader } from '../portal-header';
import { StylistSearch } from '../live-marketplace-search';

export default function StylistsPage() {
  return <><PortalHeader portal="customer"/><main className="cc-market stylists-page"><header><p className="kicker">STYLISTS NEAR YOU</p><h1>Find your perfect stylist.</h1></header><StylistSearch/></main></>;
}
