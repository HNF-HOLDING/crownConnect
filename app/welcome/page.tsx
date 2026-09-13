import Link from 'next/link';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { findAccountProfile } from '@/db/queries';

export const dynamic = 'force-dynamic';

export default async function Welcome({ searchParams }: { searchParams: Promise<{ switch?: string; returnTo?: string }> }) {
  const user = await requireChatGPTUser('/welcome');
  const [account, params] = await Promise.all([findAccountProfile(user.userId), searchParams]);
  const switching = params.switch === '1';
  return <main className="role-page">
    <a className="brand" href="/"><span aria-hidden>♛</span> CrownConnect</a>
    <div className="role-intro"><p className="eyebrow">{switching ? 'SWITCH YOUR HOME SPACE' : 'WELCOME TO CROWNCONNECT'}</p><h1>{switching ? 'Where should your account open?' : 'How will you use CrownConnect?'}</h1><p>{switching ? 'You can still visit both spaces from the menu at any time.' : 'Choose your main space. You can switch later and use both customer and seller tools.'}</p></div>
    <form className="role-cards" action="/api/account" method="post">{params.returnTo && <input type="hidden" name="returnTo" value={params.returnTo} />}
      <button className="role-card" type="submit" name="role" value="customer"><span className="role-icon" aria-hidden>✦</span><strong>I’m looking for a service</strong><span>Customer Space</span><p>Find stylists, send booking requests, and follow your appointments.</p></button>
      <button className="role-card" type="submit" name="role" value="seller"><span className="role-icon" aria-hidden>♛</span><strong>I provide services</strong><span>Seller Studio</span><p>Create your listing, add services, and manage customer requests.</p></button>
    </form>
    {account && !switching && <p className="muted role-already">Already set up? <Link href="/account">Open {account.primary_role === 'seller' ? 'Seller Studio' : 'Customer Space'}</Link>.</p>}
  </main>;
}
