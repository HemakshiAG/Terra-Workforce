import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terra Workforce',
  description: 'Offline-first workforce attendance integrity platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
