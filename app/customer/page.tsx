'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cognitoToken } from '../aws-client';
import { PortalHeader } from '../portal-header';
import { nearbyStylistsMap } from '../google-maps';

export default function CustomerPortal() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    void cognitoToken()
      .then((token) => setSignedIn(Boolean(token)))
      .catch(() => setSignedIn(false));
  }, []);
  return (
    <>
      <PortalHeader portal="customer" />
      <main className="portal-page">
        <section className="portal-hero customer-hero">
          <div>
            <p className="eyebrow">CROWNCONNECT CUSTOMER</p>
            <h1>Find your stylist. Book your next look.</h1>
            <p>
              Explore trusted local professionals, compare services and keep
              every booking in one simple customer space.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/marketplace">
                Find a stylist
              </Link>
              <a
                className="button ghost"
                href={nearbyStylistsMap}
                target="_blank"
                rel="noreferrer"
              >
                Explore on Google Maps
              </a>
              {signedIn ? (
                <Link className="button ghost" href="/my-bookings">
                  View my bookings
                </Link>
              ) : (
                <Link className="button ghost" href="/customer/join">
                  Create customer account
                </Link>
              )}
            </div>
          </div>
          <div className="portal-card">
            <span>Customer space</span>
            <h2>Everything about your appointments.</h2>
            <ul>
              <li>Discover local professionals</li>
              <li>Request dates and times</li>
              <li>Track booking decisions</li>
              <li>Keep your details private</li>
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
