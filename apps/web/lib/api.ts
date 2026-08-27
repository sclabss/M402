import type { AgentCategory, AgentSummary, HireRecord } from '@m402/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiUnreachableError extends Error {
  constructor() {
    super('Could not reach the M402 API. Is apps/api running and is NEXT_PUBLIC_API_URL set?');
    this.name = 'ApiUnreachableError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ApiUnreachableError();
  }
  if (!response.ok && response.status >= 500) {
    throw new Error(`API error ${response.status} on ${path}`);
  }
  return response.json() as Promise<T>;
}

export function listAgents(category?: AgentCategory): Promise<{ agents: AgentSummary[] }> {
  const qs = category ? `?category=${category}` : '';
  return request(`/agents${qs}`);
}

export function listExternalAgents(
  category?: AgentCategory
): Promise<{ agents: AgentSummary[]; hasMore: boolean; note?: string }> {
  const qs = category ? `?category=${category}` : '';
  return request(`/catalog/external${qs}`);
}

export function getAgent(slug: string): Promise<{ agent: AgentSummary | null }> {
  return request(`/agents/${slug}`);
}

export interface NegotiateInput {
  agentId: string;
  hirerType: 'human' | 'agent';
  hirerIdentifier?: string;
  taskDescription: string;
  deliverables: string;
  qualityStandards: string;
}

export function negotiate(
  input: NegotiateInput
): Promise<{ hire: HireRecord; quote?: Record<string, unknown>; note?: string }> {
  return request('/hire', { method: 'POST', body: JSON.stringify(input) });
}

export interface AdvantageReportTask {
  id: string;
  taskName: string;
  category: string | null;
  isHighStakes: boolean;
  ranWithAgent: boolean;
  timeSeconds: number | null;
  costUsd: number | null;
  qualityNotes: string | null;
  outputUrl: string | null;
  createdAt: string;
}

export function getAdvantageReport(): Promise<{
  tasks: AdvantageReportTask[];
  summary: { distinctTasks: number; meetsMinimumThree: boolean; hasHighStakesTask: boolean };
}> {
  return request('/advantage-report');
}

export function notifyFunded(
  hireId: string,
  jobId: number,
  txHash?: string
): Promise<{ status: string; note?: string }> {
  return request(`/hire/${hireId}/notify-funded`, {
    method: 'POST',
    body: JSON.stringify({ jobId, txHash }),
  });
}
