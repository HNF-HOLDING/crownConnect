import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RegistrationDetails({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const selectedRole = role === 'seller' ? 'seller' : 'customer';
  const returnTo = `/register?role=${selectedRole}`;
  return <main className="register-page"><Link className="brand" href="/">♛ CrownConnect</Link><div className="register-card"><p className="eyebrow">YOUR DETAILS</p><h1>Create your account</h1><p>Tell us a little about yourself. We’ll confirm your email through secure sign-in before creating your CrownConnect account.</p><form action="/api/session/sign-in" method="get" className="registration-form"><input type="hidden" name="return_to" value={returnTo} /><label>Full name<input name="fullName" autoComplete="name" required placeholder="Your full name" /></label><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Mobile number <span className="muted">Optional</span><input name="phone" type="tel" autoComplete="tel" placeholder="e.g. 076 000 0000" /></label><p className="selected-role">Joining as: <strong>{selectedRole === 'seller' ? 'Service provider' : 'Customer'}</strong></p><button className="button" type="submit">Continue to secure sign in</button></form></div></main>;
}
