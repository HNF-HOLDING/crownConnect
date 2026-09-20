'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cognitoGroups, cognitoToken } from '../aws-client';
import { PortalHeader } from '../portal-header';

export default function AdminPortal() {
  const [state, setState] = useState<'checking' | 'denied' | 'allowed'>(
    'checking',
  );
  useEffect(() => {
    void (async () => {
      if (!(await cognitoToken())) {
        window.location.replace('/admin/sign-in');
        return;
      }
      const groups = await cognitoGroups();
      setState(
        groups.includes('admin') || groups.includes('super_admin')
          ? 'allowed'
          : 'denied',
      );
    })();
  }, []);
  return (
    <>
      <PortalHeader portal="admin" />
      <main className="portal-page admin-page">
        {state === 'checking' ? (
          <div className="empty">Checking administrator access…</div>
        ) : state === 'denied' ? (
          <section className="access-denied">
            <p className="eyebrow">ACCESS RESTRICTED</p>
            <h1>This is a private staff portal.</h1>
            <p>
              Your account does not have CrownConnect administrator permission.
              Administrator access cannot be requested publicly.
            </p>
            <Link className="button ghost" href="/">
              Return to CrownConnect
            </Link>
          </section>
        ) : (
          <>
            <p className="eyebrow">ADMIN CONSOLE</p>
            <h1>Platform operations.</h1>
            <div className="admin-grid">
              <article>
                <strong>Professional applications</strong>
                <span>Approval workflow is the next implementation phase.</span>
              </article>
              <article>
                <strong>Customers and professionals</strong>
                <span>Account-management tools will appear here.</span>
              </article>
              <article>
                <strong>Reports and audit events</strong>
                <span>Administrative actions will be recorded.</span>
              </article>
            </div>
          </>
        )}
      </main>
    </>
  );
}
