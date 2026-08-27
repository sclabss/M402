-- Demo seed data: one agent per category, using the real wallet-address and
-- a2a_url shapes the deployed agents/* projects will have (placeholders
-- here -- swap in the real values `bag wallet show` and the deployed
-- AgentCore runtime URL print once each agent is actually live).
--
-- Run: supabase db execute -f supabase/seed.sql   (or paste into the SQL editor)

insert into agents (slug, name, category, description, wallet_address, chain_id, a2a_url, source)
values
  (
    'rebalancing-agent',
    'Rebalancing Agent',
    'rebalancing',
    'Watches a PancakeSwap V3 LP position and resets the range when price drifts out of it.',
    '0x0000000000000000000000000000000000000001',
    97,
    'https://rebalancing.example-agentcore.aws/',
    'native'
  ),
  (
    'gridtrading-agent',
    'Grid Trading Agent',
    'grid_trading',
    'Places and manages a grid of buy/sell orders on a pair.',
    '0x0000000000000000000000000000000000000002',
    97,
    'https://gridtrading.example-agentcore.aws/',
    'native'
  ),
  (
    'yieldoptimization-agent',
    'Yield Optimization Agent',
    'yield_optimization',
    'Compares APR across PancakeSwap, Venus, Aave V3, and Lista; moves liquidity to the best net-of-gas option.',
    '0x0000000000000000000000000000000000000003',
    97,
    'https://yieldoptimization.example-agentcore.aws/',
    'native'
  ),
  (
    'healthfactor-agent',
    'Health Factor Monitor',
    'health_factor',
    'Watches lending positions and alerts or acts before liquidation.',
    '0x0000000000000000000000000000000000000004',
    97,
    'https://healthfactor.example-agentcore.aws/',
    'native'
  )
on conflict (slug) do nothing;
