import { Router } from 'express';

export const catalogRouter = Router();

// GET /catalog/external?category=rebalancing
// Pulls supplementary listings from 8004scan (any real BSC agent in this
// category) to round out marketplace breadth alongside our native agents.
// Stubbed in session 1 -- wire up the real 8004scan Pro key in session 2.
catalogRouter.get('/external', async (_req, res) => {
  const base = process.env.SCAN_8004_BASE_URL ?? 'https://8004scan.io/api/v1/public';
  const key = process.env.SCAN_8004_API_KEY;

  if (!key) {
    return res.status(200).json({
      agents: [],
      note: 'SCAN_8004_API_KEY not set yet -- external catalog is empty until session 2.',
    });
  }

  try {
    const response = await fetch(`${base}/agents?chainId=56`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await response.json();
    res.json({ agents: data });
  } catch {
    res.status(502).json({ error: 'Could not reach 8004scan' });
  }
});
