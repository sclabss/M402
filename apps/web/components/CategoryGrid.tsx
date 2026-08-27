import Link from 'next/link';
import { AGENT_CATEGORIES, type AgentCategory } from '@m402/shared-types';
import { Panel } from './ui/Panel';

const TICKERS: Record<AgentCategory, string> = {
  rebalancing: 'RBAL',
  grid_trading: 'GRID',
  yield_optimization: 'YIELD',
  health_factor: 'HF',
};

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {AGENT_CATEGORIES.map((cat) => (
        <Link key={cat.value} href={`/agents/${cat.value}`}>
          <Panel className="group flex h-full flex-col gap-3 p-5 transition-colors hover:border-amber/50">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-amber">{TICKERS[cat.value]}</span>
              <span className="font-mono text-[11px] text-text-muted group-hover:text-amber">
                browse →
              </span>
            </div>
            <h3 className="font-display text-lg font-medium text-text">{cat.label}</h3>
            <p className="text-sm text-text-muted">{cat.blurb}</p>
          </Panel>
        </Link>
      ))}
    </div>
  );
}
