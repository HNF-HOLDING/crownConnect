'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { awsApi, cognitoToken, signOut } from '../aws-client';

type Account = {
  email: string;
  primary_role: 'customer' | 'seller';
  full_name: string;
  phone: string;
  city: string;
  province: string;
  marketing_consent: boolean;
  terms_accepted: boolean;
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

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null),
    [identityName, setIdentityName] = useState('');
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState('');
  const isSeller = account?.primary_role === 'seller';
  const requestedRole =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('role');
  useEffect(() => {
    void (async () => {
      if (!(await cognitoToken())) {
        window.location.replace('/sign-in?next=/account');
        return;
      }
      const response = await awsApi('/account'),
        data = await response.json();
      if (response.ok) {
        setAccount(data.account);
        setIdentityName(data.identity?.name || '');
      } else setMessage(data.error || 'Unable to load your account.');
      setLoading(false);
    })();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = {
      role: form.get('role'),
      fullName: form.get('fullName'),
      phone: form.get('phone'),
      city: form.get('city'),
      province: form.get('province'),
      marketingConsent: form.get('marketingConsent') === 'on',
      termsAccepted:
        form.get('termsAccepted') === 'on' || account?.terms_accepted === true,
    };
    const response = await awsApi('/account', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
      data = await response.json();
    if (!response.ok) setMessage(data.error || 'Unable to save your account.');
    else {
      setMessage('Your account details are saved securely.');
      setAccount({ ...data.account, terms_accepted: true });
    }
    setSaving(false);
  }
  if (loading)
    return (
      <main className="register-page">
        <Link className="brand" href="/">
          <span aria-hidden>♛</span> CrownConnect
        </Link>
        <p>Loading your secure account…</p>
      </main>
    );
  return (
    <main className="register-page">
      <div className="page-top">
        <Link className="brand" href="/">
          ♛ CrownConnect
        </Link>
        <button
          className="button ghost small"
          onClick={async () => {
            await signOut();
            window.location.href = '/';
          }}
        >
          Sign out
        </button>
      </div>
      <div className="register-card">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>{account ? 'Review your details' : 'Complete your profile'}</h1>
        <p>
          We only ask for details needed to manage bookings and help you find
          services. Your email comes from your verified Cognito identity.
        </p>
        {account && (
          <div className="seller-onboarding-callout" role="status">
            {isSeller ? (
              <>
                <strong>You’re ready for Seller Studio.</strong>
                <span>
                  Add services, upload your portfolio, and manage bookings from
                  one place.
                </span>
              </>
            ) : (
              <>
                <strong>Customer mode is active.</strong>
                <span>
                  Browse stylists, compare services, and manage your booking
                  requests in one place.
                </span>
              </>
            )}
          </div>
        )}
        <form className="registration-form" onSubmit={save}>
          <fieldset>
            <legend>How will you mainly use CrownConnect?</legend>
            <label className="registration-choice">
              <input
                type="radio"
                name="role"
                value="customer"
                defaultChecked={
                  account
                    ? account.primary_role === 'customer'
                    : requestedRole !== 'seller'
                }
              />
              <span>
                <strong>Customer</strong>
                <small>Find stylists and manage appointments.</small>
              </span>
            </label>
            <label className="registration-choice">
              <input
                type="radio"
                name="role"
                value="seller"
                defaultChecked={
                  account
                    ? account.primary_role === 'seller'
                    : requestedRole === 'seller'
                }
              />
              <span>
                <strong>Service provider</strong>
                <small>List services and manage customers.</small>
              </span>
            </label>
          </fieldset>
          <label>
            Full name
            <input
              name="fullName"
              autoComplete="name"
              required
              maxLength={100}
              defaultValue={account?.full_name || identityName}
            />
          </label>
          <label>
            Mobile or WhatsApp number
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={30}
              placeholder="e.g. 076 000 0000"
              defaultValue={account?.phone}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Town or city
              <input
                name="city"
                autoComplete="address-level2"
                required
                maxLength={80}
                defaultValue={account?.city}
              />
            </label>
            <label className="field">
              Province
              <select
                name="province"
                autoComplete="address-level1"
                required
                defaultValue={account?.province || ''}
              >
                <option value="" disabled>
                  Select province
                </option>
                {provinces.map((province) => (
                  <option key={province}>{province}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="registration-choice">
            <input
              type="checkbox"
              name="marketingConsent"
              defaultChecked={account?.marketing_consent}
            />
            <span>
              <strong>Product updates (optional)</strong>
              <small>
                Email me occasional CrownConnect news. Booking messages are not
                affected.
              </small>
            </span>
          </label>
          {!account?.terms_accepted && (
            <label className="registration-choice">
              <input type="checkbox" name="termsAccepted" required />
              <span>
                <strong>I agree to the terms</strong>
                <small>
                  I have read the <Link href="/terms">Terms</Link> and{' '}
                  <Link href="/privacy">Privacy Notice</Link>.
                </small>
              </span>
            </label>
          )}
          <button className="button" disabled={saving}>
            {saving
              ? 'Saving…'
              : account
                ? 'Save changes'
                : 'Create my account'}
          </button>
        </form>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {account && (
          <div className="customer-actions">
            <Link
              className="button"
              href={
                account.primary_role === 'seller'
                  ? '/pro/dashboard'
                  : '/customer'
              }
            >
              {account.primary_role === 'seller'
                ? 'Continue to CrownConnect Pro'
                : 'Open Customer space'}
            </Link>
            <Link className="button ghost" href="/my-bookings">
              My bookings
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
