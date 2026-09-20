'use client';
import { useEffect } from 'react';
export default function CustomerSignIn() {
  useEffect(() => {
    window.location.replace('/sign-in?portal=customer&next=/customer');
  }, []);
  return (
    <main className="page-shell">
      <p>Opening Customer sign in…</p>
    </main>
  );
}
