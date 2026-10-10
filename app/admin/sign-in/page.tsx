'use client';
import { useEffect } from 'react';
import { RedirectScreen } from '../../redirect-screen';
export default function AdminSignIn() {
  useEffect(() => {
    window.location.replace('/sign-in?portal=admin&next=/admin');
  }, []);
  return <RedirectScreen message="Opening secure administrator sign in…" />;
}
