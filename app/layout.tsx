import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GlowApp | Costruire e sorvegliare il Se',
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
