'use client';

import Link from 'next/link';
import { useState } from 'react';
import { chatGPTSignOutPath } from './chatgpt-auth';

export function AccountMenu({ role }: { role?: 'customer' | 'seller' }) {
  const [open, setOpen] = useState(false);
  const isSeller = role === 'seller';
  const close = () => setOpen(false);
  return <div className="account-menu">
    <button className="menu-trigger" type="button" aria-expanded={open} aria-controls="account-navigation" onClick={() => setOpen(!open)}><span aria-hidden>☰</span><span className="menu-label">Menu</span></button>
    {open && <nav id="account-navigation" className="menu-popover" aria-label="Account navigation">
      <p className="menu-title">{isSeller ? 'Seller menu' : 'Customer menu'}</p>
      <Link href="/marketplace" onClick={close}>Explore stylists</Link>
      <Link href="/account" onClick={close}>{isSeller ? 'Open Seller Studio' : 'Open Customer Space'}</Link>
      <Link href={isSeller ? '/customer' : '/seller'} onClick={close}>{isSeller ? 'I want to book a service' : 'I provide services'}</Link>
      <Link href="/welcome?switch=1" onClick={close}>Change my default space</Link>
      <a href={chatGPTSignOutPath('/')}>Sign out</a>
    </nav>}
  </div>;
}
