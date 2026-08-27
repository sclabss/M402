import { Router } from 'express';
import type { AgentCategory, AgentSummary } from '@m402/shared-types';
import { supabase } from '../lib/supabase';

export const agentsRouter = Router();

// Supabase returns raw snake_case columns; the API contract (AgentSummary)
// is camelCase. Map explicitly rather than leaking DB column naming to
// consumers -- apps/web and any external caller (TermiX) depend on this
// shape staying stable even if the DB schema evolves.
function toAgentSummary(row: Record<string, any>): AgentSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    walletAddress: row.wallet_address,
    chainId: row.chain_id,
    a2aUrl: row.a2a_url,
    source: row.source,
    liveStats: row.live_stats ?? {},
    statsUpdatedAt: row.stats_updated_at ?? null,
  };
}

// GET /agents?category=rebalancing
agentsRouter.get('/', async (req, res) => {
  const category = req.query.category as AgentCategory | undefined;

  let query = supabase.from('agents').select('*').order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ agents: (data ?? []).map(toAgentSummary) });
});

// GET /agents/:slug
agentsRouter.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', req.params.slug)
    .single();

  if (error) return res.status(404).json({ agent: null, error: 'Agent not found' });
  res.json({ agent: toAgentSummary(data) });
});
