import Link from 'next/link';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findAccountProfile } from '@/db/queries';
import { RegistrationForm } from './registration-form';

export const dynamic = 'force-dynamic';

export default async function Register({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const selectedRole = role === 'seller' ? 'seller' : role === 'customer' ? 'customer' : null;
  const user = await getChatGPTUser();
  const account = user ? await findAccountProfile(user.userId) : null;

  if (account) return <main className="register-page"><p className="eyebrow">ACCOUNT READY</p><h1>You already have a CrownConnect account.</h1><Link className="button" href="/account">Open my space</Link></main>;

  return <main className="register-page"><Link className="brand" href="/">♛ CrownConnect</Link><div className="register-card"><p className="eyebrow">CREATE ACCOUNT</p><h1>{user && selectedRole ? 'Confirm your account' : 'Join CrownConnect'}</h1>{user && selectedRole ? <><p>Signed in as {user.email}. Create your {selectedRole === 'seller' ? 'service provider' : 'customer'} account to continue.</p><form action="/api/account" method="post" className="registration-form"><input type="hidden" name="role" value={selectedRole} /><button className="button" type="submit">Create my account</button></form></> : <><p>Choose how you’ll use CrownConnect. You’ll then complete secure sign-in before your account is created.</p><RegistrationForm /></>}</div></main>;
}
