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

export interface AgentSummary {
  id: string;
  slug: string;
  name: string;
  category: AgentCategory;
  description: string;
  walletAddress: string;
  chainId: number;
  negotiateUrl: string;
  a2aAgentCardUrl?: string | null;
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
