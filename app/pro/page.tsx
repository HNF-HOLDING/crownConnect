import Link from 'next/link';
import { PortalHeader } from '../portal-header';

export default function ProPortal() {
  return (
    <>
      <PortalHeader portal="pro" />
      <main className="portal-page">
        <section className="portal-hero pro-hero">
          <div>
            <p className="eyebrow">CROWNCONNECT PRO</p>
            <h1>Run your beauty business with confidence.</h1>
            <p>
              Create a professional presence, showcase your work and manage
              customer booking requests from one dedicated workspace.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/pro/apply">
                Apply to join
              </Link>
              <Link className="button ghost" href="/pro/sign-in">
                Pro sign in
              </Link>
            </div>
            <p className="trust-copy">
              Professional profiles are moving to an approval-based model.
              Existing professionals can continue using their workspace.
            </p>
          </div>
          <div className="portal-card dark">
            <span>Professional workspace</span>
            <h2>Built for service providers.</h2>
            <ul>
              <li>Business profile and portfolio</li>
              <li>Services, prices and availability</li>
              <li>Booking request management</li>
              <li>Clear customer communication</li>
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
