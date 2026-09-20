import Link from 'next/link';
import { LandingNavLink } from './landing-nav-link';
import { SiteHeader } from './site-header';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="landing-page">
        <section className="landing-hero">
          <div>
            <p className="eyebrow">SOUTH AFRICA’S HAIR MARKETPLACE</p>
            <h1>Everything for your crown, in one place.</h1>
            <p className="landing-lead">
              Discover trusted local stylists, compare services, and book the
              look you’ve been waiting for.
            </p>
            <div className="hero-actions">
              <LandingNavLink className="button" href="/marketplace">
                Book a stylist
              </LandingNavLink>
              <LandingNavLink className="button ghost" href="/products">
                Explore hair products
              </LandingNavLink>
            </div>
            <div className="hero-badges" aria-label="CrownConnect trust highlights">
              <span>★ 4.9 client rating</span>
              <span>Verified local stylists</span>
              <span>Secure booking</span>
            </div>
            <p className="trust-copy">
              Free to explore. Create an account when you’re ready to book or
              list your services.
            </p>
          </div>
          <div
            className="landing-art"
            aria-label="CrownConnect beauty marketplace"
          >
            <div className="art-pill">BRAIDS · WIGS · WEAVES</div>
            <strong>♛</strong>
            <p>
              YOUR NEXT
              <br />
              HAIR DAY
            </p>
            <span>LOCAL TALENT</span>
          </div>
        </section>
        <section className="landing-steps">
          <div>
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>From inspiration to appointment.</h2>
          </div>
          <div className="step-grid">
            <article>
              <span>01</span>
              <h3>Explore</h3>
              <p>Browse local stylists and services.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Create your account</h3>
              <p>Secure sign-in is powered by AWS Cognito.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Book with confidence</h3>
              <p>Choose a time and send your request.</p>
            </article>
          </div>
        </section>
        <section className="landing-seller">
          <div>
            <p className="eyebrow">FOR HAIR PROFESSIONALS</p>
            <h2>Put your talent where customers can find it.</h2>
            <p>
              Build a profile, show your services, and manage bookings in Seller
              Studio.
            </p>
          </div>
          <Link className="button secondary" href="/seller">
            Open Seller Studio
          </Link>
        </section>
      </main>
      <footer>
        <Link className="brand" href="/">
          ♛ CrownConnect
        </Link>
        <p>Hair, care & community.</p>
        <span>South Africa · ZAR</span>
      </footer>
    </>
  );
}
