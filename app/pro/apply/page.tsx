'use client';
import { useEffect } from 'react';
import { RedirectScreen } from '../../redirect-screen';
export default function ProApply() {
  useEffect(() => {
    window.location.replace(
      '/sign-in?mode=signup&portal=pro&next=/account?role=seller',
    );
  }, []);
  return <RedirectScreen message="Opening CrownConnect Pro application…" />;
}
