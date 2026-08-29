import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { WalletProvider } from '@/components/WalletProvider';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'M402 — hire on-chain agents',
  description:
    'Discover, compare, and hire BNB Chain agents across rebalancing, grid trading, yield optimization, and health factor monitoring.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-ink font-body text-text antialiased">
        <WalletProvider>
          <SiteHeader />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
