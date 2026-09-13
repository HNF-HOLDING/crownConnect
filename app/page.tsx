import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth';
import { findAccountProfile } from '@/db/queries';
import { AccountMenu } from './account-menu';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  const account = user ? await findAccountProfile(user.userId) : null;
  const accountHref = account ? '/account' : '/welcome';
  return <>
    <header className="site-header landing-header">
      <a className="brand" href="/"><span aria-hidden>♛</span> CrownConnect</a>
      <nav aria-label="Primary navigation"><a href="/marketplace">Explore stylists</a><a href="#how-it-works">How it works</a></nav>
      {user ? <AccountMenu role={account?.primary_role} name={user.fullName ?? user.email} /> : <div className="landing-auth"><a className="sign-in-link" href={chatGPTSignInPath('/welcome')}>Sign in</a><a className="button small" href={chatGPTSignInPath('/welcome')}>Create account</a></div>}
    </header>
    <main className="landing-page">
      <section className="landing-hero">
        <div><p className="eyebrow">SOUTH AFRICA’S HAIR MARKETPLACE</p><h1>Everything for your crown, in one place.</h1><p className="landing-lead">Discover talented local stylists, book your next appointment, and explore the hair looks you love.</p><div className="hero-actions"><a className="button" href={accountHref}>Find a stylist</a><a className="button ghost" href="/marketplace">Browse the marketplace</a></div><p className="trust-copy">Free to explore. Create an account when you’re ready to book or list your services.</p></div>
        <div className="landing-art" aria-label="CrownConnect beauty marketplace"><div className="art-pill">BRAIDS · WIGS · WEAVES</div><strong>♛</strong><p>YOUR NEXT<br />HAIR DAY</p><span>LOCAL TALENT</span></div>
      </section>
      <section id="how-it-works" className="landing-steps" aria-labelledby="steps-heading"><div><p className="eyebrow">HOW IT WORKS</p><h2 id="steps-heading">From inspiration to appointment.</h2></div><div className="step-grid"><article><span>01</span><h3>Explore</h3><p>Browse local stylists and the services they offer.</p></article><article><span>02</span><h3>Create your account</h3><p>Choose Customer Space or Seller Studio in a few taps.</p></article><article><span>03</span><h3>Book with confidence</h3><p>Choose a time and send your booking request directly.</p></article></div></section>
      <section className="landing-seller"><div><p className="eyebrow">FOR HAIR PROFESSIONALS</p><h2>Put your talent where customers can find it.</h2><p>Build a seller profile, show your services, and manage booking requests in Seller Studio.</p></div><a className="button secondary" href={accountHref}>List your business</a></section>
    </main>
    <footer><a className="brand" href="/">♛ CrownConnect</a><p>Hair, care & community.</p><span>South Africa · ZAR</span></footer>
  </>;
}
