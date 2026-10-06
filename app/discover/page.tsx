import { PortalHeader } from '../portal-header';
import { HairstyleCard, SearchBar } from '../marketplace-components';
import { looks } from '../marketplace-data';

export default function DiscoverPage() {
  return <><PortalHeader portal="customer"/><main className="cc-market feed-page"><header className="feed-heading"><div><p className="kicker">DISCOVER</p><h1>Hair inspiration, made bookable.</h1><p>Save the styles you love, meet their creators and book the exact look.</p></div><SearchBar compact/></header><div className="feed-tabs"><button className="active">For you</button><button>Trending</button><button>Braids</button><button>Wigs</button><button>Natural hair</button><button>Locs</button><button>Cornrows</button></div><div className="discover-grid">{[...looks, ...looks].map((look, index) => <HairstyleCard key={`${look.slug}-${index}`} look={look}/>)}</div></main></>;
}
