'use client';
import { useEffect } from 'react';
export default function Register() {
  useEffect(() => {
    window.location.replace('/sign-in?mode=signup');
  }, []);
  return (
    <main className="register-page">
      <p>Opening secure account creation…</p>
    </main>
  );
}
