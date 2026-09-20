'use client';
import { useEffect } from 'react';
import { RedirectScreen } from '../redirect-screen';

export default function Welcome() {
  useEffect(() => {
    window.location.replace('/marketplace');
  }, []);

  return <RedirectScreen message="Opening your CrownConnect discovery page…" />;
}
