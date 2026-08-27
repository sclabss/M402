import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

export const advantageReportRouter = Router();

const taskSchema = z.object({
  taskName: z.string(),
  category: z.enum(['rebalancing', 'grid_trading', 'yield_optimization', 'health_factor']).optional(),
  isHighStakes: z.boolean().default(false),
  ranWithAgent: z.boolean(),
  timeSeconds: z.number().optional(),
  costUsd: z.number().optional(),
  qualityNotes: z.string().optional(),
  outputUrl: z.string().url().optional(),
  hireId: z.string().uuid().optional(),
});

function toApiShape(row: Record<string, any>) {
  return {
    id: row.id,
    taskName: row.task_name,
    category: row.category,
    isHighStakes: row.is_high_stakes,
    ranWithAgent: row.ran_with_agent,
    timeSeconds: row.time_seconds,
    costUsd: row.cost_usd,
    qualityNotes: row.quality_notes,
    outputUrl: row.output_url,
    hireId: row.hire_id,
    createdAt: row.created_at,
  };
}

// GET /advantage-report
// Every logged task, both arms (ranWithAgent true/false) included so the
// frontend can pair them up. TermiX's "Proven agent advantage" criterion
// (30% of that track) is scored against this data -- see the required
// shape in the hackathon brief: >=3 real tasks run both ways, each with
// time/cost/quality and the actual output attached, at least one from
// trading/stock/security (isHighStakes).
advantageReportRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('advantage_report_tasks')
    .select('*')
    .order('task_name', { ascending: true })
    .order('ran_with_agent', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const tasks = (data ?? []).map(toApiShape);
  const taskNames = [...new Set(tasks.map((t) => t.taskName))];
  const highStakesLogged = tasks.some((t) => t.isHighStakes);

  res.json({
    tasks,
    summary: {
      distinctTasks: taskNames.length,
      meetsMinimumThree: taskNames.length >= 3,
      hasHighStakesTask: highStakesLogged,
    },
  });
});

// POST /advantage-report
// Log one arm of one task. Call it twice per task -- once with
// ranWithAgent: true (hired through the marketplace), once false (done
// manually) -- with the real numbers each time, as you actually run them.
advantageReportRouter.post('/', async (req, res) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('advantage_report_tasks')
    .insert({
      task_name: parsed.data.taskName,
      category: parsed.data.category,
      is_high_stakes: parsed.data.isHighStakes,
      ran_with_agent: parsed.data.ranWithAgent,
      time_seconds: parsed.data.timeSeconds,
      cost_usd: parsed.data.costUsd,
      quality_notes: parsed.data.qualityNotes,
      output_url: parsed.data.outputUrl,
      hire_id: parsed.data.hireId,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ task: toApiShape(data) });
});
