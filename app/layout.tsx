import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Client Portal',
  description: 'Projects, files, and tasks for clients',
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
