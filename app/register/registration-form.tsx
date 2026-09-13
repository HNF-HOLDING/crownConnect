'use client';

import { FormEvent, useState } from 'react';

export function RegistrationForm() {
  const [role, setRole] = useState<'customer' | 'seller'>('customer');

  function continueToSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const returnTo = `/register?role=${role}`;
    window.location.assign(`/api/session/sign-in?return_to=${encodeURIComponent(returnTo)}`);
  }

  return <form className="registration-form" onSubmit={continueToSignIn}>
    <fieldset><legend>I want to join as</legend>
      <label className="registration-choice"><input type="radio" name="role" value="customer" checked={role === 'customer'} onChange={() => setRole('customer')} /><span><strong>Customer</strong><small>Book hairstylists and explore hair products.</small></span></label>
      <label className="registration-choice"><input type="radio" name="role" value="seller" checked={role === 'seller'} onChange={() => setRole('seller')} /><span><strong>Service provider</strong><small>Create a salon profile, add services, and manage requests.</small></span></label>
    </fieldset>
    <button className="button" type="submit">Continue to create account</button>
  </form>;
}
