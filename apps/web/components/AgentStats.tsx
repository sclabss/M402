import type { AgentStats } from '@m402/shared-types';
import { hasAgentStats, primaryMetric } from '@m402/shared-types';

function fmt(value: number | null, format: 'pct' | 'usd' | 'count'): string {
  if (value === null) return '—';
  if (format === 'pct') return `${value.toFixed(1)}%`;
  if (format === 'usd') return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return value.toLocaleString();
}

/** Compact: the one metric that matters most for this category, for a card in a list. */
export function StatsBadgeCompact({ stats }: { stats: AgentStats | Record<string, never> }) {
  if (!hasAgentStats(stats)) {
    return <span className="font-mono text-[11px] text-text-muted">no track record yet</span>;
  }
  const metric = primaryMetric(stats);
  return (
    <span className="font-mono text-[11px] text-text">
      {metric.label}: <span className="text-sage">{fmt(metric.value, metric.format)}</span>
    </span>
  );
}

/** Full: every stat this category tracks, for the agent detail page. */
export function StatsFull({ stats }: { stats: AgentStats | Record<string, never> }) {
  if (!hasAgentStats(stats)) {
    return (
      <p className="text-sm text-text-muted">
        No track record reported yet. This agent hasn&apos;t run enough real jobs to have
        performance data — not the same as having bad stats, just none.
      </p>
    );
  }

  const rows: { label: string; value: string }[] = (() => {
    switch (stats.category) {
      case 'rebalancing':
        return [
          { label: 'Positions managed', value: fmt(stats.positionsManaged, 'count') },
          { label: 'Time in range', value: fmt(stats.timeInRangePct, 'pct') },
          { label: 'Total rebalances', value: fmt(stats.totalRebalances, 'count') },
          { label: 'Last rebalance', value: stats.lastRebalanceAt ?? '—' },
        ];
      case 'grid_trading':
        return [
          { label: 'Total trades', value: fmt(stats.totalTrades, 'count') },
          { label: 'Win rate', value: fmt(stats.winRatePct, 'pct') },
          { label: 'Realized P&L', value: fmt(stats.realizedPnlUsd, 'usd') },
          { label: 'Active since', value: stats.activeSince ?? '—' },
        ];
      case 'yield_optimization':
        return [
          { label: 'Current APR', value: fmt(stats.currentAprPct, 'pct') },
          { label: 'Capital deployed', value: fmt(stats.capitalDeployedUsd, 'usd') },
          { label: 'Venues compared', value: fmt(stats.venuesCompared, 'count') },
        ];
      case 'health_factor':
        return [
          { label: 'Positions monitored', value: fmt(stats.positionsMonitored, 'count') },
          { label: 'Avg health factor', value: fmt(stats.avgHealthFactor, 'count') },
          { label: 'Lowest seen', value: fmt(stats.lowestHealthFactorSeen, 'count') },
          { label: 'Liquidations prevented', value: fmt(stats.liquidationsPrevented, 'count') },
        ];
    }
  })();

  return (
    <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5">
          <dt className="text-text-muted">{row.label}</dt>
          <dd className="text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
