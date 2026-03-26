import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Costruire e sorvegliare il Sé',
  description: 'MVP per trasformare la tua immagine in aspirazione.',
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
