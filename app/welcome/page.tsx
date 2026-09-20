'use client';
import { useEffect } from 'react';

export default function Welcome() {
  useEffect(() => {
    window.location.replace('/marketplace');
  }, []);

  return (
    <main className="register-page">
      <p>Opening your CrownConnect discovery page…</p>
    </main>
  );
}
