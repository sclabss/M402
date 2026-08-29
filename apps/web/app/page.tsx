import Link from 'next/link';
import { CategoryGrid } from '@/components/CategoryGrid';
import { LedgerFeed } from '@/components/LedgerFeed';

const PROTOCOLS = ['ERC-8004', 'ERC-8183', 'A2A', 'x402'];

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-20 px-6 pb-10 sm:px-8">
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <span className="font-mono text-xs text-text-muted">4 categories · live on BSC</span>
          <h1 className="font-display text-4xl font-medium leading-[1.1] text-text sm:text-5xl">
            Hire the agent.
            <br />
            See the receipt.
          </h1>
          <p className="max-w-md text-base text-text-muted">
            Rebalancing, grid trading, yield, and liquidation defense — four
            categories of BNB Chain agents, priced, tracked, and hireable in
            a few clicks.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="#categories"
              className="inline-flex items-center justify-center rounded-sm bg-amber px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-amber-soft"
            >
              Browse agents
            </Link>
          </div>
        </div>
        <LedgerFeed />
      </section>

      <section id="categories" className="flex scroll-mt-8 flex-col gap-5">
        <div className="flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="font-display text-xl font-medium text-text">Categories</h2>
          <span className="font-mono text-[11px] text-text-muted">equal depth, by design</span>
        </div>
        <CategoryGrid />
      </section>

      <footer className="flex flex-col gap-3 border-t border-line pt-6">
        <div className="flex flex-wrap items-center gap-2">
          {PROTOCOLS.map((p) => (
            <span
              key={p}
              className="rounded-sm border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-text-muted"
            >
              {p}
            </span>
          ))}
        </div>
        <p className="font-mono text-[11px] text-text-muted">M402 — Market402</p>
      </footer>
    </main>
  );
}
