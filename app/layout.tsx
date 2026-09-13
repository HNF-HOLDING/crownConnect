import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrownConnect — Local hairstylists and booking requests',
  description: 'Discover independent hairstylists and request your next appointment.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
