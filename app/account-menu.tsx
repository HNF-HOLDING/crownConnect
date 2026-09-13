'use client';

import Link from 'next/link';
import { useState } from 'react';

export function AccountMenu({ role, name }: { role?: 'customer' | 'seller'; name?: string }) {
  const [open, setOpen] = useState(false);
  const isSeller = role === 'seller';
  const close = () => setOpen(false);
  return <div className="account-menu">
    <button className="menu-trigger" type="button" aria-expanded={open} aria-controls="account-navigation" onClick={() => setOpen(!open)}><span className="profile-avatar" aria-hidden>{(name?.trim().slice(0, 1) || 'U').toUpperCase()}</span><span className="menu-label">My profile</span></button>
    {open && <nav id="account-navigation" className="menu-popover" aria-label="Account navigation">
      <p className="menu-title">{isSeller ? 'Seller menu' : 'Customer menu'}</p>
      <Link href="/marketplace" onClick={close}>Explore stylists</Link>
      <Link href="/products" onClick={close}>Browse hair products</Link>
      <Link href="/account" onClick={close}>{isSeller ? 'Open Seller Studio' : 'Open Customer Space'}</Link>
      <Link href={isSeller ? '/customer' : '/seller'} onClick={close}>{isSeller ? 'I want to book a service' : 'I provide services'}</Link>
      <Link href="/welcome?switch=1" onClick={close}>Change my default space</Link>
      <a href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
    </nav>}
  </div>;
}
