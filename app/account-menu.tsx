import Link from 'next/link';
import { chatGPTSignOutPath } from './chatgpt-auth';

export function AccountMenu({ role }: { role?: 'customer' | 'seller' }) {
  const current = role === 'seller' ? 'Seller Studio' : 'Customer Space';
  return <details className="account-menu">
    <summary aria-label="Open account menu"><span aria-hidden>☰</span><span className="menu-label">Menu</span></summary>
    <div className="menu-popover">
      <p className="menu-title">{current}</p>
      <Link href="/marketplace">Browse marketplace</Link>
      <Link href="/account">My home</Link>
      <Link href="/customer">Customer Space</Link>
      <Link href="/seller">Seller Studio</Link>
      <Link href="/welcome?switch=1">Switch default space</Link>
      <a href={chatGPTSignOutPath('/')}>Sign out</a>
    </div>
  </details>;
}
