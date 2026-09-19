'use client';
import { useEffect } from 'react';
export default function CustomerSpace() { useEffect(() => { window.location.replace('/my-bookings'); }, []); return <main className="page-shell"><p>Opening Customer Space…</p></main>; }
