import { PortalHeader } from '../portal-header';
import { ProductCard, SearchBar } from '../marketplace-components';
import { products } from '../marketplace-data';

export default function ShopPage() {
  return <><PortalHeader portal="customer"/><main className="cc-market shop-page"><header className="shop-hero"><div><p className="kicker">CROWNCONNECT SHOP</p><h1>Everything for the look.</h1><p>Shop trusted hair, wigs, extensions and salon-grade care selected by working stylists.</p></div><SearchBar compact/></header><div className="filter-pills"><button className="active">All products</button><button>Wigs</button><button>Braids</button><button>Extensions</button><button>Bundles</button><button>Hair care</button><button>Styling</button></div><div className="product-grid large">{[...products, ...products].map((product,index) => <ProductCard key={`${product.id}-${index}`} product={product}/>)}</div></main></>;
}
