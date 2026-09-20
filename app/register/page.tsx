'use client';
import { useEffect } from 'react';
import { RedirectScreen } from '../redirect-screen';
export default function Register() {
  useEffect(() => {
    window.location.replace('/sign-in?mode=signup');
  }, []);
  return <RedirectScreen message="Opening secure account creation…" />;
}
