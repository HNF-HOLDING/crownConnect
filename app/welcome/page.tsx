'use client';
import { useEffect } from 'react';
export default function Welcome() { useEffect(() => { window.location.replace('/account'); }, []); return <main className="register-page"><p>Opening account setup…</p></main>; }
