'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { awsApi, cognitoToken } from '../../aws-client';
import { PortalHeader } from '../../portal-header';

type Application = {
  id: string;
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
  review_note: string;
  submitted_at: string;
};
const provinces = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

export default function ProApply() {
  const [application, setApplication] = useState<Application | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState('');
  useEffect(() => {
    void (async () => {
      if (!(await cognitoToken())) {
        window.location.replace(
          '/sign-in?mode=signup&portal=pro&next=/pro/apply',
        );
        return;
      }
      const response = await awsApi('/pro/application'),
        data = await response.json();
      if (response.ok) setApplication(data.application);
      else setMessage(data.error || 'Unable to load your application.');
      setLoading(false);
    })();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await awsApi('/pro/application', {
      method: 'POST',
      body: JSON.stringify({
        legalName: form.get('legalName'),
        businessName: form.get('businessName'),
        phone: form.get('phone'),
        city: form.get('city'),
        province: form.get('province'),
        serviceArea: form.get('serviceArea'),
        categories: form.get('categories'),
        yearsExperience: Number(form.get('yearsExperience')),
        bio: form.get('bio'),
        providerAgreement: form.get('providerAgreement') === 'on',
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setApplication(data.application);
      setMessage('Application submitted for CrownConnect review.');
    } else setMessage(data.error || 'Unable to submit your application.');
    setSaving(false);
  }
  const editable =
    !application ||
    application.status === 'more_information' ||
    application.status === 'rejected';
  return (
    <>
      <PortalHeader portal="pro" />
      <main className="page-shell pro-application-page">
        <div className="page-top">
          <div>
            <p className="eyebrow">CROWNCONNECT PRO APPLICATION</p>
            <h1>
              {application
                ? 'Application status'
                : 'Apply to join CrownConnect Pro.'}
            </h1>
          </div>
          <Link href="/pro">Back to Pro home</Link>
        </div>
        {loading ? (
          <div className="empty">Loading your application…</div>
        ) : (
          <>
            {application && (
              <section
                className={`application-status status-${application.status}`}
              >
                <span>{application.status.replace('_', ' ')}</span>
                <h2>{application.business_name}</h2>
                <p>
                  {application.status === 'approved'
                    ? 'Your business is approved. You can now open CrownConnect Pro.'
                    : application.status === 'more_information'
                      ? 'CrownConnect needs more information before continuing.'
                      : application.status === 'rejected'
                        ? 'This application was not approved. You may update and resubmit it.'
                        : 'Your application is safely submitted and awaiting review.'}
                </p>
                {application.review_note && (
                  <p>
                    <strong>Review note:</strong> {application.review_note}
                  </p>
                )}
                {application.status === 'approved' && (
                  <Link className="button" href="/pro/dashboard">
                    Open Pro workspace
                  </Link>
                )}
              </section>
            )}
            {editable && (
              <form className="panel registration-form" onSubmit={submit}>
                <div className="form-grid">
                  <label className="field">
                    Legal full name
                    <input
                      name="legalName"
                      required
                      maxLength={100}
                      defaultValue={application?.legal_name}
                    />
                  </label>
                  <label className="field">
                    Business or trading name
                    <input
                      name="businessName"
                      required
                      maxLength={120}
                      defaultValue={application?.business_name}
                    />
                  </label>
                  <label className="field">
                    Mobile or WhatsApp
                    <input
                      name="phone"
                      type="tel"
                      required
                      maxLength={30}
                      defaultValue={application?.phone}
                    />
                  </label>
                  <label className="field">
                    Years of experience
                    <input
                      name="yearsExperience"
                      type="number"
                      min="0"
                      max="80"
                      required
                      defaultValue={application?.years_experience ?? 0}
                    />
                  </label>
                  <label className="field">
                    Town or city
                    <input
                      name="city"
                      required
                      maxLength={80}
                      defaultValue={application?.city}
                    />
                  </label>
                  <label className="field">
                    Province
                    <select
                      name="province"
                      required
                      defaultValue={application?.province || ''}
                    >
                      <option value="" disabled>
                        Select province
                      </option>
                      {provinces.map((province) => (
                        <option key={province}>{province}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field full">
                    Service area
                    <input
                      name="serviceArea"
                      required
                      maxLength={120}
                      placeholder="e.g. Cape Town CBD and Southern Suburbs"
                      defaultValue={application?.service_area}
                    />
                  </label>
                  <label className="field full">
                    Service categories
                    <input
                      name="categories"
                      required
                      maxLength={300}
                      placeholder="e.g. Braids, wigs, natural hair"
                      defaultValue={application?.categories}
                    />
                  </label>
                  <label className="field full">
                    Professional background
                    <textarea
                      name="bio"
                      required
                      minLength={40}
                      maxLength={1000}
                      defaultValue={application?.bio}
                    />
                  </label>
                </div>
                <label className="registration-choice">
                  <input type="checkbox" name="providerAgreement" required />
                  <span>
                    <strong>I accept the provider agreement</strong>
                    <small>
                      I confirm these details are accurate and agree to
                      professional verification and marketplace standards.
                    </small>
                  </span>
                </label>
                <button className="button" disabled={saving}>
                  {saving
                    ? 'Submitting…'
                    : application
                      ? 'Update and resubmit'
                      : 'Submit application'}
                </button>
              </form>
            )}
            {message && (
              <p className="notice" role="status">
                {message}
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
