'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cognitoToken } from './aws-client';

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    void cognitoToken()
      .then((token) => setSignedIn(Boolean(token)))
      .catch(() => setSignedIn(false));
  }, []);
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span aria-hidden>♛</span> CrownConnect
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/customer">Customer</Link>
        <Link href="/pro">For professionals</Link>
      </nav>
      <div className="header-actions">
        {signedIn ? (
          <>
            <Link className="sign-in-link" href="/my-bookings">
              My bookings
            </Link>
            <Link className="button small" href="/account">
              My account
            </Link>
          </>
        ) : (
          <>
            <Link className="sign-in-link" href="/sign-in">
              Sign in
            </Link>
            <Link className="button small" href="/sign-in?mode=signup">
              Create account
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
