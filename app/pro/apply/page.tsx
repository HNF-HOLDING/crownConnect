'use client';
import { useEffect } from 'react';
export default function ProApply() {
  useEffect(() => {
    window.location.replace(
      '/sign-in?mode=signup&portal=pro&next=/account?role=seller',
    );
  }, []);
  return (
    <main className="page-shell">
      <p>Opening CrownConnect Pro application…</p>
    </main>
  );
}
