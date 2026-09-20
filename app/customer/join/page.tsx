'use client';
import { useEffect } from 'react';
export default function CustomerJoin() {
  useEffect(() => {
    window.location.replace(
      '/sign-in?mode=signup&portal=customer&next=/account?role=customer',
    );
  }, []);
  return (
    <main className="page-shell">
      <p>Opening Customer registration…</p>
    </main>
  );
}
