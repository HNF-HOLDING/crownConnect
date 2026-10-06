import { MapPinned } from 'lucide-react';
import { PortalHeader } from '../portal-header';
import { SearchBar, StylistCard } from '../marketplace-components';
import { stylists } from '../marketplace-data';

export default function StylistsPage() {
  return <><PortalHeader portal="customer"/><main className="cc-market stylists-page"><header><p className="kicker">STYLISTS NEAR YOU</p><h1>Find your perfect stylist.</h1><SearchBar compact/></header><div className="filter-pills"><button>Distance⌄</button><button>Hairstyle⌄</button><button>Price⌄</button><button>Rating⌄</button><button>Availability⌄</button><button>Stylist type⌄</button></div><div className="stylist-search-layout"><div className="stylist-results">{stylists.map(stylist => <StylistCard key={stylist.id} stylist={stylist}/>)}</div><aside className="map-mock"><div className="map-road one"/><div className="map-road two"/><div className="map-road three"/>{stylists.map((s,i)=><span key={s.id} className={`map-pin pin-${i}`}><MapPinned/> R{s.price}</span>)}<div className="map-label">Pretoria</div></aside></div></main></>;
}
