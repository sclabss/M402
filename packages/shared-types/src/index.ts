export type AgentCategory =
  | 'rebalancing'
  | 'grid_trading'
  | 'yield_optimization'
  | 'health_factor';

export const AGENT_CATEGORIES: {
  value: AgentCategory;
  label: string;
  blurb: string;
}[] = [
  {
    value: 'rebalancing',
    label: 'Rebalancing',
    blurb: 'Manages LP ranges, resets positions automatically.',
  },
  {
    value: 'grid_trading',
    label: 'Grid Trading',
    blurb: 'Places and manages automated grid orders.',
  },
  {
    value: 'yield_optimization',
    label: 'Yield Optimization',
    blurb: 'Routes liquidity to the highest available APR.',
  },
  {
    value: 'health_factor',
    label: 'Health Factor Monitoring',
    blurb: 'Protects lending positions from liquidation.',
  },
];

export type HireStatus = 'quoted' | 'funded' | 'fulfilled' | 'settled' | 'failed';

// Two different naming conventions collide here on purpose, and it's worth
// being explicit rather than assuming they match: AgentCategory values use
// underscores (our own taxonomy), but `bag init <name>` rejects '-'/'_'/'.'
// entirely (AgentCore runtime name constraint) -- so the agents/ folder
// names are the same words with separators stripped. Anything that needs to
// point at a folder in agents/ should go through this map, not re-derive it.
export const CATEGORY_AGENT_FOLDER: Record<AgentCategory, string> = {
  rebalancing: 'rebalancing',
  grid_trading: 'gridtrading',
  yield_optimization: 'yieldoptimization',
  health_factor: 'healthfactor',
};

export interface AgentSummary {
  id: string;
  slug: string;
  name: string;
  category: AgentCategory;
  description: string;
  walletAddress: string;
  chainId: number;
  // The agent's one A2A endpoint -- card lives at `${a2aUrl}/.well-known/agent-card.json`,
  // message/send (negotiate, notify_funded) is POSTed to a2aUrl itself.
  a2aUrl: string;
  source: 'native' | '8004scan';
  liveStats: Record<string, number | string>;
  statsUpdatedAt?: string | null;
}

export interface HireRequest {
  agentId: string;
  hirerType: 'human' | 'agent';
  hirerIdentifier?: string;
  payload?: Record<string, unknown>;
}

// Sensible per-category defaults for the negotiate call's required terms, so
// the Activate flow can offer "one click, sane defaults" while still being a
// real, complete negotiate request underneath -- editable in an Advanced
// section for anyone who wants to be specific. Keeps "minimal friction" and
// "not a REST toy" both true at once.
export const CATEGORY_DEFAULT_TERMS: Record<
  AgentCategory,
  { taskDescription: string; deliverables: string; qualityStandards: string }
> = {
  rebalancing: {
    taskDescription:
      'Monitor my PancakeSwap V3 LP position and rebalance the range when price drifts out of it.',
    deliverables: 'A rebalance report per action taken: old range, new range, gas cost, tx hash.',
    qualityStandards: 'Position stays in range at least 90% of the time; rebalances minimize gas spend.',
  },
  grid_trading: {
    taskDescription: 'Run a grid trading strategy on my chosen pair within my risk parameters.',
    deliverables: 'Trade log per fill: side, price, size, tx hash, running realized P&L.',
    qualityStandards: 'Stays within the configured price bounds; no single trade exceeds the size cap.',
  },
  yield_optimization: {
    taskDescription:
      'Compare yield across PancakeSwap, Venus, Aave V3, and Lista, and route my liquidity to the best net-of-gas option.',
    deliverables: 'A comparison + allocation report: APR per venue considered, chosen venue, gas cost.',
    qualityStandards: 'Only reallocates when the net-of-gas APR improvement clears a sensible threshold.',
  },
  health_factor: {
    taskDescription: 'Monitor my lending position health factor and protect it from liquidation.',
    deliverables: 'An alert/action log: health factor readings, any protective action taken, tx hash.',
    qualityStandards: 'Never lets health factor cross the liquidation threshold within its response window.',
  },
};

export interface HireRecord {
  id: string;
  agentId: string;
  status: HireStatus;
  quoteAmount?: number | null;
  quoteCurrency?: string | null;
  txHash?: string | null;
  createdAt: string;
  updatedAt: string;
}
