import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hub UCOB Analytics — Sistema de Gestão de Vendas',
  description: 'Painel gerencial de acompanhamento de metas, evolução de cotas e rankings de vendas de colportagem para o Hub UCOB.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body suppressHydrationWarning className="bg-brand-50 min-h-screen font-sans antialiased text-brand-900 selection:bg-brand-100 selection:text-brand-900">
        {children}
      </body>
    </html>
  );
}

