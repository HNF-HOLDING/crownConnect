import { PortalHeader } from '../portal-header';
import { DiscoverSearch } from '../live-marketplace-search';

export default function DiscoverPage() {
  return <><PortalHeader portal="customer"/><main className="cc-market feed-page"><header className="feed-heading"><div><p className="kicker">DISCOVER</p><h1>Hair inspiration, made bookable.</h1><p>Save the styles you love, meet their creators and book the exact look.</p></div></header><DiscoverSearch/></main></>;
}
