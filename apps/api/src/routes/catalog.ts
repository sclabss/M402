import { Router } from 'express';
import type { AgentCategory, AgentSummary } from '@m402/shared-types';
import { listScanAgents, type ScanAgent } from '../lib/eightThousandFourScan';

export const catalogRouter = Router();

// 8004scan has no concept of our four-category taxonomy -- it has
// `supported_protocols` (MCP/A2A/OASF/Web/Email) instead. There's no exact
// mapping, so this is a best-effort text search against the category label,
// combined with protocol=A2A since interoperability with our stack is the
// actual requirement. Worth being honest that this is a heuristic, not a
// guaranteed category match -- flagged in the response `note`, not hidden.
const CATEGORY_SEARCH_HINT: Record<AgentCategory, string> = {
  rebalancing: 'liquidity rebalancing',
  grid_trading: 'grid trading',
  yield_optimization: 'yield optimization',
  health_factor: 'liquidation health factor',
};

function toAgentSummary(scan: ScanAgent, category?: AgentCategory): AgentSummary {
  return {
    id: `8004scan:${scan.chain_id}:${scan.token_id}`,
    slug: `8004scan-${scan.chain_id}-${scan.token_id}`,
    name: scan.name,
    category: category ?? 'rebalancing', // best-effort bucket; see note above
    description: scan.description ?? 'No description provided.', // live API returns null sometimes, despite the OpenAPI schema not marking it nullable
    walletAddress: scan.owner_address,
    chainId: scan.chain_id,
    a2aUrl: '', // 8004scan doesn't publish this directly; would need a
    // follow-up GET /agents/{chainId}/{tokenId} + card-discovery pass.
    source: '8004scan',
    liveStats: {
      total_score: scan.total_score,
      star_count: scan.star_count,
      total_feedbacks: scan.total_feedbacks,
    },
    statsUpdatedAt: null,
  };
}

// GET /catalog/external?category=rebalancing
// Real 8004scan agents to round out a category's listings alongside our own
// four. Works anonymously (10 req/min); set SCAN_8004_API_KEY to raise the
// ceiling once the hackathon's Pro-tier form is approved.
catalogRouter.get('/external', async (req, res) => {
  const category = req.query.category as AgentCategory | undefined;
  const chainId = req.query.chainId ? Number(req.query.chainId) : 56; // BSC mainnet default

  try {
    const { agents, hasMore } = await listScanAgents({
      chainId,
      protocol: 'A2A',
      search: category ? CATEGORY_SEARCH_HINT[category] : undefined,
      // Fetched limit is pre-filter (see eightThousandFourScan.ts's note on
      // the protocol param not reliably filtering server-side) -- a larger
      // page improves the odds of real A2A matches surviving the client-side
      // filter without following pagination, which isn't implemented here.
      limit: 50,
    });

    res.json({
      agents: agents.map((a) => toAgentSummary(a, category)),
      hasMore,
      note: category
        ? `Matched by searching "${CATEGORY_SEARCH_HINT[category]}" + protocol=A2A -- 8004scan has no native category filter, so treat this as a heuristic, not a guarantee.`
        : undefined,
    });
  } catch (err) {
    res.status(502).json({ agents: [], error: err instanceof Error ? err.message : 'Could not reach 8004scan' });
  }
});
