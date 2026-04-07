import type { Metadata } from 'next';
import './globals.css';
import { APP_VERSION } from '../lib/version';

export const metadata: Metadata = {
  title: `GlowApp v${APP_VERSION} | Costruire e Sorvegliare il Se`,
  description: 'Web app per costruire una moodboard visiva, unificare descrizioni AI e generare un risultato ispirazionale.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
