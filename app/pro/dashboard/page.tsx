'use client';
import { useEffect } from 'react';
import { RedirectScreen } from '../../redirect-screen';
export default function ProDashboard() {
  useEffect(() => {
    window.location.replace('/seller');
  }, []);
  return <RedirectScreen message="Opening CrownConnect Pro…" />;
}
