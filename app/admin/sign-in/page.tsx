'use client';
import { useEffect } from 'react';
export default function AdminSignIn() {
  useEffect(() => {
    window.location.replace('/sign-in?portal=admin&next=/admin');
  }, []);
  return (
    <main className="page-shell">
      <p>Opening secure administrator sign in…</p>
    </main>
  );
}
