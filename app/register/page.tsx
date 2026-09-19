'use client';
import { useEffect } from 'react';
export default function Register() { useEffect(() => { window.location.replace('/sign-in'); }, []); return <main className="register-page"><p>Opening secure sign in…</p></main>; }
