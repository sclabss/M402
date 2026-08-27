'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from './ui/StatusBadge';

// Illustrative rows for the session-1 scaffold, cycling client-side so the
// hero isn't a static screenshot. Session 2 replaces this with a real feed
// off GET /hire (recent settlements) via the api app -- see the TODO in
// apps/api/src/routes/hire.ts for the other half of this wire-up.
const MOCK_EVENTS = [
  { agent: 'rebal-0x4f2a', category: 'RBAL', status: 'settled' },
  { agent: 'grid-0x91cc', category: 'GRID', status: 'fulfilled' },
  { agent: 'yield-0x22b1', category: 'YIELD', status: 'quoted' },
  { agent: 'health-0x77de', category: 'HF', status: 'settled' },
  { agent: 'grid-0x0a4e', category: 'GRID', status: 'funded' },
  { agent: 'rebal-0xd812', category: 'RBAL', status: 'fulfilled' },
];

export function LedgerFeed() {
  const [rows, setRows] = useState(MOCK_EVENTS.slice(0, 4));

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % MOCK_EVENTS.length;
      setRows((prev) => [MOCK_EVENTS[i], ...prev.slice(0, 3)]);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
          Live settlement ledger
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-sage">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" />
          live
        </span>
      </div>
      <div className="divide-y divide-line">
        {rows.map((row, idx) => (
          <div
            key={`${row.agent}-${idx}`}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 font-mono text-xs"
          >
            <span className="truncate text-text">{row.agent}</span>
            <span className="text-text-muted">{row.category}</span>
            <StatusBadge status={row.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
