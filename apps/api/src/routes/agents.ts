import { Router } from 'express';
import type { AgentCategory } from '@m402/shared-types';
import { supabase } from '../lib/supabase';

export const agentsRouter = Router();

// GET /agents?category=rebalancing
agentsRouter.get('/', async (req, res) => {
  const category = req.query.category as AgentCategory | undefined;

  let query = supabase.from('agents').select('*').order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ agents: data });
});

// GET /agents/:slug
agentsRouter.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', req.params.slug)
    .single();

  if (error) return res.status(404).json({ error: 'Agent not found' });
  res.json({ agent: data });
});
