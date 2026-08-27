import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

export const hireRouter = Router();

const hireRequestSchema = z.object({
  agentId: z.string().uuid(),
  hirerType: z.enum(['human', 'agent']),
  hirerIdentifier: z.string().optional(),
  taskDescription: z.string(),
  deliverables: z.string(),
  qualityStandards: z.string(),
});

/**
 * Build a real A2A `message/send` JSON-RPC request carrying the `negotiate`
 * skill as a DataPart. Shape verified against @a2a-js/sdk's own types
 * (Message, DataPart, SendMessageRequest) -- not guessed. See
 * ARCHITECTURE.md for why this replaced an earlier REST-POST assumption.
 */
function buildNegotiateRequest(task: {
  taskDescription: string;
  deliverables: string;
  qualityStandards: string;
}) {
  return {
    jsonrpc: '2.0' as const,
    id: randomUUID(),
    method: 'message/send' as const,
    params: {
      message: {
        kind: 'message' as const,
        messageId: randomUUID(),
        role: 'user' as const,
        parts: [
          {
            kind: 'data' as const,
            data: {
              skill: 'negotiate',
              task_description: task.taskDescription,
              terms: {
                deliverables: task.deliverables,
                quality_standards: task.qualityStandards,
              },
            },
          },
        ],
      },
    },
  };
}

function buildNotifyFundedRequest(jobId: number) {
  return {
    jsonrpc: '2.0' as const,
    id: randomUUID(),
    method: 'message/send' as const,
    params: {
      message: {
        kind: 'message' as const,
        messageId: randomUUID(),
        role: 'user' as const,
        parts: [{ kind: 'data' as const, data: { skill: 'notify_funded', job_id: jobId } }],
      },
    },
  };
}

/**
 * Extract the DataPart payload out of an A2A message/send response. The
 * seller's reply is itself a Message with parts; the negotiate/notify_funded
 * result rides in a DataPart, same shape as the request.
 */
function extractDataPart(a2aResponse: any): Record<string, unknown> | null {
  const parts = a2aResponse?.result?.parts ?? a2aResponse?.result?.status?.message?.parts ?? [];
  const dataPart = Array.isArray(parts) ? parts.find((p: any) => p?.kind === 'data') : null;
  return dataPart?.data ?? null;
}

// POST /hire
// Step 1 of the real flow: negotiate. Opens a `hires` row, sends the A2A
// negotiate skill to the target agent, and stores the signed quote it gets
// back. This is the one door both the web UI and an external caller (TermiX,
// or any other A2A client) come through.
//
// NOTE on auth: a deployed AgentCore agent requires an OAuth2 (Cognito)
// bearer -- there is no anonymous mode in production, only in local `bag
// dev`. Client-credentials token acquisition against each agent's Cognito
// pool is session-2-plus work (needs the pool details `bag deploy
// provision-cognito` emits per agent); this route calls the agent directly
// and surfaces an auth failure honestly rather than silently swallowing it.
hireRouter.post('/', async (req, res) => {
  const parsed = hireRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { agentId, hirerType, hirerIdentifier, taskDescription, deliverables, qualityStandards } =
    parsed.data;

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, a2a_url')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const negotiateRequest = buildNegotiateRequest({ taskDescription, deliverables, qualityStandards });

  const { data: hire, error: hireError } = await supabase
    .from('hires')
    .insert({
      agent_id: agentId,
      hirer_type: hirerType,
      hirer_identifier: hirerIdentifier,
      status: 'quoted',
      request_payload: negotiateRequest,
    })
    .select()
    .single();

  if (hireError || !hire) {
    return res.status(500).json({ error: 'Could not open hire record' });
  }

  try {
    const response = await fetch(agent.a2a_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(negotiateRequest),
    });

    if (response.status === 401 || response.status === 403) {
      return res.status(202).json({
        hire,
        note: 'Negotiate sent, but the agent requires an OAuth2 bearer (deployed AgentCore has no anonymous mode). Token exchange against its Cognito pool is not wired up yet -- see the NOTE in hire.ts.',
      });
    }

    if (!response.ok) {
      return res.status(202).json({ hire, note: `Agent responded ${response.status}; hire record is open.` });
    }

    const a2aResponse = await response.json();
    const quote = extractDataPart(a2aResponse);

    const { data: updated } = await supabase
      .from('hires')
      .update({
        result_payload: a2aResponse,
        negotiation_hash: (quote?.negotiation_hash as string) ?? null,
        quote_amount: quote?.price ? Number(quote.price) : null,
      })
      .eq('id', hire.id)
      .select()
      .single();

    res.status(200).json({ hire: updated ?? hire, quote });
  } catch {
    res.status(202).json({ hire, note: 'Negotiate requested; agent did not respond (unreachable or not yet deployed).' });
  }
});

// POST /hire/:id/notify-funded
// Step 2: once the buyer has funded the negotiated job on-chain (an ERC-8183
// createJob + fund transaction -- a real wallet signature, not something
// this API can do on a caller's behalf), call this with the resulting job_id
// to tell the seller "deliver". The seller acks at once and works in the
// background; the actual deliverable is read back from the chain once the
// job reaches SUBMITTED, not from this response -- see agents/*/README.md.
const notifyFundedSchema = z.object({ jobId: z.number().int(), txHash: z.string().optional() });

hireRouter.post('/:id/notify-funded', async (req, res) => {
  const parsed = notifyFundedSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: hire, error } = await supabase
    .from('hires')
    .select('id, agent_id, agents(a2a_url)')
    .eq('id', req.params.id)
    .single();

  if (error || !hire) return res.status(404).json({ error: 'Hire not found' });

  const a2aUrl = (hire as any).agents?.a2a_url;
  const notifyRequest = buildNotifyFundedRequest(parsed.data.jobId);

  await supabase
    .from('hires')
    .update({ status: 'funded', erc8183_job_id: parsed.data.jobId, tx_hash: parsed.data.txHash })
    .eq('id', hire.id);

  try {
    const response = await fetch(a2aUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifyRequest),
    });
    const a2aResponse = response.ok ? await response.json() : null;
    const ack = a2aResponse ? extractDataPart(a2aResponse) : null;

    if (ack?.status === 'accepted') {
      await supabase.from('hires').update({ status: 'fulfilled' }).eq('id', hire.id);
    }

    res.json({ status: ack?.status ?? 'sent', note: 'Deliverable lands on-chain in the background; poll the chain, not this API, for it.' });
  } catch {
    res.status(202).json({ note: 'notify_funded sent; agent did not respond yet.' });
  }
});

// GET /hire/:id
hireRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('hires').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Hire not found' });
  res.json({ hire: data });
});
