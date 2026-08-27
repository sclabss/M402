-- M402 core schema
-- Categories are fixed to the four Main Track categories.

create type agent_category as enum (
  'rebalancing',
  'grid_trading',
  'yield_optimization',
  'health_factor'
);

create type hire_status as enum (
  'quoted',
  'funded',
  'fulfilled',
  'settled',
  'failed'
);

create type hirer_type as enum (
  'human',
  'agent'
);

-- One row per seller agent surfaced on the marketplace.
create table agents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category agent_category not null,
  description text not null,
  wallet_address text not null,
  chain_id integer not null default 97,  -- 97 = BSC testnet, 56 = BSC mainnet
  erc8004_token_id text,
  -- The agent's single A2A endpoint (its Agent Card lives at
  -- {a2a_url}/.well-known/agent-card.json; JSON-RPC message/send is POSTed
  -- to {a2a_url} itself). "Negotiate" and "notify_funded" are A2A skills
  -- invoked over this one URL, not separate REST routes -- verified against
  -- a real `bag init` scaffold, see ARCHITECTURE.md.
  a2a_url text not null,
  source text not null default 'native', -- 'native' (built by us) | '8004scan' (aggregated)
  live_stats jsonb not null default '{}'::jsonb,  -- category-specific, short TTL
  stats_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agents_category_idx on agents (category);
create index agents_chain_idx on agents (chain_id);

-- Every hire, from either a human on the marketplace or another agent
-- (e.g. TermiX) calling the relay directly. Mirrors the negotiate -> fund ->
-- fulfill -> settle lifecycle described in ARCHITECTURE.md.
create table hires (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  hirer_type hirer_type not null,
  hirer_identifier text,   -- wallet address, or caller name if known (e.g. 'termix')
  status hire_status not null default 'quoted',
  quote_amount numeric,          -- wei, in the agent's [payments.erc8183] currency (U, 18dp)
  quote_currency text default 'U',
  negotiation_hash text,         -- from the agent's signed negotiate response
  erc8183_job_id bigint,         -- on-chain job id, set once the buyer funds the job
  tx_hash text,
  request_payload jsonb,         -- the negotiate skill envelope we sent
  result_payload jsonb,          -- the raw signed offer / notify_funded ack
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hires_agent_idx on hires (agent_id);
create index hires_status_idx on hires (status);

-- Required TermiX deliverable: >=3 real tasks run both ways (agent vs.
-- manual), each reporting time, cost, and quality, with actual outputs
-- attached. At least one row here must have is_high_stakes = true.
create table advantage_report_tasks (
  id uuid primary key default gen_random_uuid(),
  task_name text not null,
  category agent_category,
  is_high_stakes boolean not null default false,
  ran_with_agent boolean not null,
  time_seconds numeric,
  cost_usd numeric,
  quality_notes text,
  output_url text,          -- link to the attached real output
  hire_id uuid references hires (id),
  created_at timestamptz not null default now()
);

-- Minimal profile table layered on Supabase auth.users, for the human-facing
-- hire flow (wallet connect + activation).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  wallet_address text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table agents enable row level security;
alter table hires enable row level security;
alter table advantage_report_tasks enable row level security;
alter table profiles enable row level security;

-- Catalog and the Advantage Report are public read; writes go through the
-- API's service role only.
create policy "agents are publicly readable" on agents for select using (true);
create policy "advantage report is publicly readable" on advantage_report_tasks for select using (true);

-- Hires: a signed-in user can read their own; the API's service role
-- handles writes and the broader reads the marketplace itself needs.
create policy "users read their own hires" on hires for select using (
  auth.uid() is not null
  and hirer_identifier = (select wallet_address from profiles where id = auth.uid())
);

create policy "users read their own profile" on profiles for select using (auth.uid() = id);
create policy "users update their own profile" on profiles for update using (auth.uid() = id);
