import Link from 'next/link';

export function RedirectScreen({ message }: { message: string }) {
  return (
    <main className="redirect-screen">
      <Link className="brand" href="/">
        <span aria-hidden>♛</span> CrownConnect
      </Link>
      <div className="redirect-card">
        <span className="redirect-crown" aria-hidden>
          ♛
        </span>
        <p>{message}</p>
      </div>
    </main>
  );
}
