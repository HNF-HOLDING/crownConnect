'use client';
import { useEffect } from 'react';
export default function ProDashboard() {
  useEffect(() => {
    window.location.replace('/seller');
  }, []);
  return (
    <main className="page-shell">
      <p>Opening CrownConnect Pro…</p>
    </main>
  );
}
