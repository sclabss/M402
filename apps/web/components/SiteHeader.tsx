'use client';

import Link from 'next/link';
import { useWallet } from './WalletProvider';
import { Button } from './ui/Button';

/**
 * Rendered once, from app/layout.tsx, on every page. This is the actual
 * fix for three reported bugs at once, not three separate patches:
 * "Browse agents"/"Connect Wallet" not working were both buttons with no
 * onClick/href, and "can't return home" was never a nav-bar bug
 * specifically -- no page except "/" rendered any header or nav at all.
 */
export function SiteHeader() {
  const wallet = useWallet();

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 sm:px-8">
      <Link href="/" className="font-mono text-sm font-medium tracking-wide text-text hover:text-amber">
        M402
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/advantage-report" className="hidden font-mono text-xs text-text-muted hover:text-amber sm:inline">
          Advantage Report
        </Link>
        {wallet.address ? (
          <span className="font-mono text-xs text-text-muted">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            {!wallet.onBsc && <span className="text-amber"> — switch to BSC</span>}
          </span>
        ) : (
          <Button variant="ghost" onClick={wallet.connect} disabled={wallet.connecting}>
            {wallet.connecting ? 'Connecting…' : 'Connect Wallet'}
          </Button>
        )}
      </nav>
    </header>
  );
}
