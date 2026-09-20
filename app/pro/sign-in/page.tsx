'use client';
import { useEffect } from 'react';
import { RedirectScreen } from '../../redirect-screen';
export default function ProSignIn() {
  useEffect(() => {
    window.location.replace('/sign-in?portal=pro&next=/pro/dashboard');
  }, []);
  return <RedirectScreen message="Opening Pro sign in…" />;
}
