'use client';
import { useEffect } from 'react';
export default function ProSignIn() {
  useEffect(() => {
    window.location.replace('/sign-in?portal=pro&next=/pro/dashboard');
  }, []);
  return (
    <main className="page-shell">
      <p>Opening Pro sign in…</p>
    </main>
  );
}
