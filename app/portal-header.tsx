'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cognitoToken } from './aws-client';
import { Compass, Home, Scissors, ShoppingBag, UserRound } from 'lucide-react';

export function PortalHeader({
  portal,
}: {
  portal: 'customer' | 'pro' | 'admin';
}) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void cognitoToken()
      .then((token) => setSignedIn(Boolean(token)))
      .catch(() => setSignedIn(false));
  }, []);
  const name =
    portal === 'pro'
      ? 'CrownConnect Pro'
      : portal === 'admin'
        ? 'CrownConnect Admin'
        : 'CrownConnect';
  return (
    <header className={`site-header portal-header ${portal}`}>
      <Link
        className="brand"
        href={portal === 'customer' ? '/customer' : `/${portal}`}
      >
        <span aria-hidden>♛</span> {name}
      </Link>
      <nav aria-label={`${name} navigation`}>
        {portal === 'customer' ? (
          <>
            <Link href="/customer">Home</Link>
            <Link href="/discover">Discover</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/stylists">Stylists</Link>
            <Link href="/my-bookings">Bookings</Link>
          </>
        ) : portal === 'pro' ? (
          <>
            <Link href="/pro">Pro home</Link>
            {signedIn && <Link href="/pro/dashboard">Dashboard</Link>}
          </>
        ) : (
          <Link href="/admin">Secure portal</Link>
        )}
      </nav>
      <div className="header-actions">
        {signedIn ? (
          <Link
            className="button small"
            href={
              portal === 'pro'
                ? '/pro/dashboard'
                : portal === 'admin'
                  ? '/admin'
                  : '/account'
            }
          >
            {portal === 'pro'
              ? 'Open workspace'
              : portal === 'admin'
                ? 'Admin console'
                : 'My account'}
          </Link>
        ) : (
          <Link className="button small" href={`/${portal}/sign-in`}>
            Sign in
          </Link>
        )}
      </div>
      {portal === 'customer' && <nav className="mobile-customer-nav" aria-label="Mobile customer navigation">
        <Link href="/customer"><Home/><span>Home</span></Link><Link href="/discover"><Compass/><span>Discover</span></Link><Link href="/shop"><ShoppingBag/><span>Shop</span></Link><Link href="/stylists"><Scissors/><span>Stylists</span></Link><Link href="/account"><UserRound/><span>Profile</span></Link>
      </nav>}
    </header>
  );
}
