'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiUrl } from '../aws-client';

type Seller = {
  id: string;
  business_name: string;
  city: string;
  specialty: string;
  featured_service: string;
  service_price: number;
  bio: string;
};

const api = apiUrl;
const defaultDistanceKm = 8;

export function AwsMarketplace() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/sellers`)
      .then((response) => response.json())
      .then((data) => setSellers(data.sellers ?? []))
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="marketplace-page">
        <section className="marketplace-intro">
          <p className="eyebrow">BOOK LOCAL TALENT</p>
          <h1>A stylist for your style.</h1>
          <p>Discover professionals using the CrownConnect AWS marketplace.</p>
        </section>
        <p className="market-count">Loading stylists…</p>
      </main>
    );
  }

  if (!sellers.length) {
    return (
      <main className="marketplace-page empty-marketplace">
        <section className="marketplace-intro">
          <p className="eyebrow">BOOK LOCAL TALENT</p>
          <h1>A stylist for your style.</h1>
          <p>Discover professionals using the CrownConnect AWS marketplace.</p>
        </section>

        <div className="marketplace-empty-state" role="status">
          <h2>No stylists available yet</h2>
          <p>
            The marketplace is still being populated. Sign up as a seller to join
            the next wave of local talent.
          </p>
          <Link className="button" href="/sign-in?mode=signup">
            Become a seller
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="marketplace-page">
      <section className="marketplace-intro">
        <p className="eyebrow">BOOK LOCAL TALENT</p>
        <h1>A stylist for your style.</h1>
        <p>Discover professionals using the CrownConnect AWS marketplace.</p>
      </section>

      <p className="market-count">
        {sellers.length} {sellers.length === 1 ? 'stylist' : 'stylists'} found
      </p>

      <div className="grid">
        {sellers.map((seller) => (
          <article className="card live-card" key={seller.id}>
            <div className="service-art">
              <span>{seller.specialty}</span>
              <strong>{seller.business_name.slice(0, 1)}</strong>
            </div>
            <div className="card-meta">
              <span className="rating-chip">★ 4.9</span>
              <span className="soft-badge">Verified</span>
            </div>
            <div className="trust-row">
              <span className="local-trust-pill">Verified local stylist</span>
              <span className="distance-pill">Within {defaultDistanceKm} km</span>
            </div>
            <p className="badge">{seller.specialty}</p>
            <h3>{seller.featured_service}</h3>
            <p>{seller.business_name}</p>
            <div className="location-row">
              <span>⌖ {seller.city}</span>
              <span className="service-area">Local service area</span>
            </div>
            <div className="mini-tags">
              <span>{seller.specialty}</span>
              <span>Local talent</span>
            </div>
            <p className="card-bio">{seller.bio}</p>
            <div className="card-footer">
              <strong>From R{seller.service_price.toLocaleString('en-ZA')}</strong>
              <Link href={`/book/${seller.id}`}>View &amp; request ↗</Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

