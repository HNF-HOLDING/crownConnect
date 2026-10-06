import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrownConnect — Discover, shop and book your next look',
  description: 'Discover hairstyles, shop hair and beauty products, and book trusted stylists near you.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
