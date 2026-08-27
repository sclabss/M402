// Typed client for the real 8004scan public API, built directly from its
// published OpenAPI spec (https://8004scan.io/api/v1/public/docs/openapi.json)
// rather than the endpoint-name list alone. Two corrections that mattered
// versus the session-1 stub: auth is an `X-API-Key` header, not a Bearer
// token, and every response is wrapped in `{ success, data, meta }`, not a
// bare array.

const BASE_URL = process.env.SCAN_8004_BASE_URL ?? 'https://8004scan.io/api/v1/public';

export interface ScanAgent {
  id: string;
  agent_id: string;
  // The OpenAPI spec declares this as an integer; live responses return it
  // as a string ("68149"). Trusting the live shape over the doc, since a
  // wrong primitive type here would silently misbehave rather than throw.
  token_id: string;
  chain_id: number;
  name: string;
  description: string | null;
  image_url?: string | null;
  owner_address: string;
  supported_protocols: string[];
  total_score: number;
  star_count: number;
  total_feedbacks: number;
  created_at: string;
}

interface ScanEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { pagination?: { page: number; limit: number; total: number; hasMore: boolean } };
}

function headers(): Record<string, string> {
  const key = process.env.SCAN_8004_API_KEY;
  // Anonymous access works (10 req/min) -- the key just raises the ceiling.
  // Real header name per the OpenAPI spec's securitySchemes: X-API-Key.
  return key ? { 'X-API-Key': key } : {};
}

export interface ListAgentsParams {
  chainId?: number;
  protocol?: 'MCP' | 'A2A' | 'OASF' | 'Web' | 'Email';
  search?: string;
  isTestnet?: boolean;
  page?: number;
  limit?: number;
}

export async function listScanAgents(params: ListAgentsParams = {}): Promise<{
  agents: ScanAgent[];
  hasMore: boolean;
}> {
  const qs = new URLSearchParams();
  if (params.chainId != null) qs.set('chainId', String(params.chainId));
  if (params.protocol) qs.set('protocol', params.protocol);
  if (params.search) qs.set('search', params.search);
  if (params.isTestnet != null) qs.set('isTestnet', String(params.isTestnet));
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 20));

  const response = await fetch(`${BASE_URL}/agents?${qs}`, { headers: headers() });
  if (!response.ok) {
    throw new Error(`8004scan responded ${response.status}`);
  }
  const body = (await response.json()) as ScanEnvelope<ScanAgent[]>;
  const agents = body.data ?? [];

  // Verified live (2026-08-24): the server-side `protocol` query param does
  // not reliably filter -- most rows returned for protocol=A2A had
  // supported_protocols: ["Web"] or []. Filtering client-side rather than
  // trusting the param, since silently returning non-A2A agents from a
  // function that promises protocol filtering is worse than an extra check.
  const filtered = params.protocol ? agents.filter((a) => a.supported_protocols?.includes(params.protocol!)) : agents;

  return { agents: filtered, hasMore: body.meta?.pagination?.hasMore ?? false };
}
