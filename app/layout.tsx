import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Portal',
  description: 'Projects, files, and tasks for clients',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
