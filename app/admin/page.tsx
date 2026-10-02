'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  awsApi,
  cognitoToken,
  fetchAuthSession,
  signOut,
} from '../aws-client';
import { PortalHeader } from '../portal-header';

export default function AdminPortal() {
  const [state, setState] = useState<'checking' | 'denied' | 'allowed'>(
    'checking',
  );
  const [applications, setApplications] = useState<any[]>([]),
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
