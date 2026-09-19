'use client';
import { useEffect } from 'react';
import { awsApi, cognitoToken } from '../aws-client';
export default function Account() { useEffect(() => { void (async () => { if (!(await cognitoToken())) { window.location.replace('/sign-in?next=/account'); return; } const response = await awsApi('/seller'); const data = await response.json().catch(() => ({})); window.location.replace(response.ok && data.seller ? '/seller' : '/my-bookings'); })(); }, []); return <main className="page-shell"><p>Opening your CrownConnect space…</p></main>; }
