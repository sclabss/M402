import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

export const hireRouter = Router();

const hireRequestSchema = z.object({
  agentId: z.string().uuid(),
  hirerType: z.enum(['human', 'agent']),
  hirerIdentifier: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

// POST /hire
// The relay: looks up the target agent's own negotiate endpoint and proxies
// the request. This is the single door both the web UI and external callers
// (TermiX, or any A2A/ERC-8183 agent) come through -- see ARCHITECTURE.md.
hireRouter.post('/', async (req, res) => {
  const parsed = hireRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { agentId, hirerType, hirerIdentifier, payload } = parsed.data;

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, negotiate_url')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const { data: hire, error: hireError } = await supabase
    .from('hires')
    .insert({
      agent_id: agentId,
      hirer_type: hirerType,
      hirer_identifier: hirerIdentifier,
      status: 'quoted',
      request_payload: payload ?? {},
    })
    .select()
    .single();

  if (hireError || !hire) {
    return res.status(500).json({ error: 'Could not open hire record' });
  }

  try {
    // TODO(session 2): send the real ERC-8183 quote envelope, store the
    // signed quote, and move status -> 'funded' once the buyer funds the job
    // on-chain. Stubbed here so the shape of the flow is real end to end.
    const response = await fetch(agent.negotiate_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hireId: hire.id, ...payload }),
    }).catch(() => null);

    if (!response || !response.ok) {
      return res.status(202).json({
        hire,
        note: 'Quote requested; negotiate endpoint not yet reachable. Hire record is open.',
      });
    }

    const quote = await response.json();
    res.status(200).json({ hire, quote });
  } catch {
    res.status(202).json({ hire, note: 'Quote requested; agent did not respond yet.' });
  }
});

// GET /hire/:id
hireRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('hires').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Hire not found' });
  res.json({ hire: data });
});
