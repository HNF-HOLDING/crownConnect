'use client';
import { useEffect } from 'react';
import { RedirectScreen } from '../../redirect-screen';
export default function CustomerJoin() {
  useEffect(() => {
    window.location.replace(
      '/sign-in?mode=signup&portal=customer&next=/account?role=customer',
    );
  }, []);
  return <RedirectScreen message="Opening Customer registration…" />;
}
