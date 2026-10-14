'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { awsApi, cognitoToken, fetchAuthSession, signOut } from '../aws-client';
import { PortalHeader } from '../portal-header';

type ProfessionalApplication = {
  id: string;
  email: string;
  legal_name: string;
  business_name: string;
  phone: string;
  city: string;
  province: string;
  service_area: string;
  categories: string;
  years_experience: number;
  bio: string;
  status: string;
  identity_type?: string;
  identity_number_last4?: string;
  business_registration_number?: string;
  fulfilment_model?: string;
  collection_street_address?: string;
  collection_suburb?: string;
  collection_city?: string;
  collection_province?: string;
  collection_postal_code?: string;
  returns_same_as_collection?: boolean;
  return_street_address?: string;
  return_suburb?: string;
  return_city?: string;
  return_province?: string;
  return_postal_code?: string;
  bank_name?: string;
  bank_account_type?: string;
  bank_account_last4?: string;
  default_stock_quantity?: number;
  handling_days?: number;
  default_product_weight_kg?: number;
  default_package_length_cm?: number;
  default_package_width_cm?: number;
  default_package_height_cm?: number;
  review_note?: string;
};

export default function AdminPortal() {
  const [state, setState] = useState<'checking' | 'denied' | 'allowed'>(
    'checking',
  );
  const [applications, setApplications] = useState<ProfessionalApplication[]>(
      [],
    ),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  async function loadApplications() {
    const response = await awsApi('/admin/applications'),
      data = await response.json();
    if (!response.ok)
      throw new Error(data.error || 'Unable to load applications.');
    setApplications(data.applications || []);
  }
  useEffect(() => {
    void (async () => {
      if (!(await cognitoToken())) {
        window.location.replace('/admin/sign-in');
        return;
      }
      try {
        // Refresh Cognito first so recently assigned staff groups are included.
        // The protected API remains the authority for administrator access.
        await fetchAuthSession({ forceRefresh: true });
        await loadApplications();
        setState('allowed');
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : 'Unable to load applications.';
        if (/administrator permission|required|forbidden/i.test(message)) {
          setState('denied');
        } else {
          setState('allowed');
          setError(message);
        }
      }
    })();
  }, []);
  async function review(id: string, status: string) {
    setBusy(`${id}:${status}`);
    setError('');
    const response = await awsApi(`/admin/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNote: notes[id] || '' }),
      }),
      data = await response.json();
    if (!response.ok) setError(data.error || 'Unable to save this decision.');
    else await loadApplications();
    setBusy('');
  }
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
            <div className="inline-actions">
              <button
                className="button"
                onClick={() => {
                  void signOut().finally(() =>
                    window.location.replace(
                      '/sign-in?portal=admin&next=/admin',
                    ),
                  );
                }}
              >
                Sign out and use administrator account
              </button>
              <Link className="button ghost" href="/">
                Return to CrownConnect
              </Link>
            </div>
          </section>
        ) : (
          <>
            <p className="eyebrow">ADMIN CONSOLE</p>
            <h1>Professional applications.</h1>
            <p className="space-lead">
              Review each provider before they can publish a profile or access
              CrownConnect Pro.
            </p>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            {!applications.length ? (
              <div className="empty">
                No professional applications are waiting for review.
              </div>
            ) : (
              <section className="application-list">
                {applications.map((application) => (
                  <article className="application-review" key={application.id}>
                    <div className="booking-head">
                      <div>
                        <p className="eyebrow">
                          {application.status.replace('_', ' ')}
                        </p>
                        <h2>{application.business_name}</h2>
                        <p>
                          {application.legal_name} · {application.email}
                          <br />
                          {application.phone} · {application.city},{' '}
                          {application.province}
                        </p>
                      </div>
                      <span className={`status ${application.status}`}>
                        {application.status.replace('_', ' ')}
                      </span>
                    </div>
                    <dl>
                      <div>
                        <dt>Service area</dt>
                        <dd>{application.service_area}</dd>
                      </div>
                      <div>
                        <dt>Categories</dt>
                        <dd>{application.categories}</dd>
                      </div>
                      <div>
                        <dt>Experience</dt>
                        <dd>{application.years_experience} years</dd>
                      </div>
                      <div>
                        <dt>Verification</dt>
                        <dd>
                          {application.identity_type?.replaceAll('_', ' ')} ·
                          ending {application.identity_number_last4}
                        </dd>
                      </div>
                      <div>
                        <dt>Business registration</dt>
                        <dd>
                          {application.business_registration_number ||
                            'Sole trader / not supplied'}
                        </dd>
                      </div>
                      <div>
                        <dt>Fulfilment</dt>
                        <dd>
                          {application.fulfilment_model?.replaceAll('_', ' ')}
                        </dd>
                      </div>
                      <div>
                        <dt>Collection address</dt>
                        <dd>
                          {application.collection_street_address},{' '}
                          {application.collection_suburb},{' '}
                          {application.collection_city},{' '}
                          {application.collection_province}{' '}
                          {application.collection_postal_code}
                        </dd>
                      </div>
                      <div>
                        <dt>Returns</dt>
                        <dd>
                          {application.returns_same_as_collection
                            ? 'Same as collection address'
                            : `${application.return_street_address}, ${application.return_suburb}, ${application.return_city}, ${application.return_province} ${application.return_postal_code}`}
                        </dd>
                      </div>
                      <div>
                        <dt>Payout account</dt>
                        <dd>
                          {application.bank_name} ·{' '}
                          {application.bank_account_type} · ending{' '}
                          {application.bank_account_last4}
                        </dd>
                      </div>
                      <div>
                        <dt>Stock and handling</dt>
                        <dd>
                          {application.default_stock_quantity} units ·{' '}
                          {application.handling_days} business day(s)
                        </dd>
                      </div>
                      <div>
                        <dt>Default packed parcel</dt>
                        <dd>
                          {application.default_product_weight_kg} kg ·{' '}
                          {application.default_package_length_cm} ×{' '}
                          {application.default_package_width_cm} ×{' '}
                          {application.default_package_height_cm} cm
                        </dd>
                      </div>
                    </dl>
                    <p>{application.bio}</p>
                    <label>
                      Review note
                      <textarea
                        value={
                          notes[application.id] ?? application.review_note ?? ''
                        }
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [application.id]: event.target.value,
                          }))
                        }
                        maxLength={1000}
                        placeholder="Required when requesting information or rejecting"
                      />
                    </label>
                    <div className="inline-actions">
                      <button
                        className="button ghost small"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void review(application.id, 'under_review')
                        }
                      >
                        Mark under review
                      </button>
                      <button
                        className="button ghost small"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void review(application.id, 'more_information')
                        }
                      >
                        Request information
                      </button>
                      <button
                        className="button small"
                        disabled={Boolean(busy)}
                        onClick={() => void review(application.id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="button danger small"
                        disabled={Boolean(busy)}
                        onClick={() => void review(application.id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
