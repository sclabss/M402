import { Router } from 'express';
import { z } from 'zod';
import type { AgentCategory, AgentSummary } from '@m402/shared-types';
import { hasAgentStats, primaryMetric } from '@m402/shared-types';
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
    reputationStats: null, // reputation is 8004scan-specific; native agents don't have it
    statsUpdatedAt: row.stats_updated_at ?? null,
  };
}

// GET /agents?category=rebalancing&sort=performance
// `sort=performance` orders by each category's own primary metric (win
// rate for grid trading, time-in-range for rebalancing, etc. -- see
// primaryMetric() in shared-types) so "which one should I hire" has an
// actual answer beyond reading every card. Agents with no reported stats
// yet sort last, not hidden -- a new agent with no track record is real
// information too, not a gap to paper over.
agentsRouter.get('/', async (req, res) => {
  const category = req.query.category as AgentCategory | undefined;
  const sort = req.query.sort as string | undefined;

  let query = supabase.from('agents').select('*').order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let agents = (data ?? []).map(toAgentSummary);

  if (sort === 'performance') {
    agents = [...agents].sort((a, b) => {
      const av = hasAgentStats(a.liveStats) ? primaryMetric(a.liveStats).value : null;
      const bv = hasAgentStats(b.liveStats) ? primaryMetric(b.liveStats).value : null;
      if (av === null && bv === null) return 0;
      if (av === null) return 1; // no track record sorts last, not first
      if (bv === null) return -1;
      return bv - av; // higher is better for every metric primaryMetric() defines
    });
  }

  res.json({ agents });
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

const statsSchema = z.discriminatedUnion('category', [
  z.object({
    category: z.literal('rebalancing'),
    positionsManaged: z.number().int().nonnegative(),
    timeInRangePct: z.number().min(0).max(100).nullable(),
    totalRebalances: z.number().int().nonnegative(),
    lastRebalanceAt: z.string().nullable(),
  }),
  z.object({
    category: z.literal('grid_trading'),
    totalTrades: z.number().int().nonnegative(),
    winRatePct: z.number().min(0).max(100).nullable(),
    realizedPnlUsd: z.number().nullable(),
    activeSince: z.string().nullable(),
  }),
  z.object({
    category: z.literal('yield_optimization'),
    currentAprPct: z.number().nullable(),
    capitalDeployedUsd: z.number().nullable(),
    venuesCompared: z.number().int().nonnegative(),
  }),
  z.object({
    category: z.literal('health_factor'),
    positionsMonitored: z.number().int().nonnegative(),
    avgHealthFactor: z.number().nullable(),
    lowestHealthFactorSeen: z.number().nullable(),
    liquidationsPrevented: z.number().int().nonnegative(),
  }),
]);

// POST /agents/:id/stats
// How real performance data actually gets into the marketplace: an agent
// (or whatever process runs its strategy loop) reports its own numbers
// after doing real work. Not wired into any agent yet this session --
// see the note in README.md -- but this is the real endpoint for it, not
// a stub. Validates the reported category matches the agent's own
// category, so a miswired agent can't post another category's stat shape.
agentsRouter.post('/:id/stats', async (req, res) => {
  const parsed = statsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: agent, error: fetchError } = await supabase
    .from('agents')
    .select('category')
    .eq('id', req.params.id)
    .single();
  if (fetchError || !agent) return res.status(404).json({ error: 'Agent not found' });

  if (agent.category !== parsed.data.category) {
    return res.status(400).json({
      error: `Stats category (${parsed.data.category}) does not match this agent's category (${agent.category}).`,
    });
  }

  const { error: updateError } = await supabase
    .from('agents')
    .update({ live_stats: parsed.data, stats_updated_at: new Date().toISOString() })
    .eq('id', req.params.id);

  if (updateError) return res.status(500).json({ error: updateError.message });
  res.json({ ok: true });
});
