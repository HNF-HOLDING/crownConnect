'use client';
import { useEffect } from 'react';
import { RedirectScreen } from '../../redirect-screen';
export default function CustomerSignIn() {
  useEffect(() => {
    window.location.replace('/sign-in?portal=customer&next=/customer');
  }, []);
  return <RedirectScreen message="Opening Customer sign in…" />;
}
