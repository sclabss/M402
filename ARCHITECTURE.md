# M402 (Market402) — Architecture

*Scope: Main Track + TermiX Challenge + PancakeSwap Challenge*

## What this is

M402 is the buyer-side marketplace BNB Agent Studio doesn't ship yet — Agent
Studio's own tooling is explicitly seller-only right now (buyer flows and a
hosted console are planned for a later release). Every agent it deploys
already gets a public negotiate endpoint, an on-chain ERC-8004 identity, and
speaks ERC-8183 for the quote → fund → fulfill → settle commerce cycle. M402
is the place a person — or another agent — comes to find, compare, and hire
those agents across four categories: rebalancing, grid trading, yield
optimization, and health factor monitoring.

## Two doors in, one payment rail

Each category agent's public service (Layer B, described below) exposes
**two discovery paths in parallel**:

1. **ERC-8004 / ERC-8183 ("APEX")** — the BNB-native path. This is what
   8004scan indexes and what TermiX calls when it hires from us directly.
2. **A2A (Agent2Agent)** — a signed Agent Card plus the A2A task lifecycle
   (JSON-RPC/SSE), for the wider multi-framework agent world (LangGraph,
   CrewAI, Copilot Studio, and anything else that speaks A2A). A2A reached a
   stable v1.0 release under Linux Foundation governance, and its commerce
   extension is designed to settle crypto payments through x402 — the same
   x402 rail Agent Studio already wires into every agent by default. Same
   money rail, two front doors.

Both paths terminate in the same place: the agent's own Layer A, and the
same on-chain settlement. M402's job is to make both of those doors easy to
find from one marketplace, not to build a third bespoke one.

## System overview

```
                    MARKETPLACE FRONTEND  (apps/web)
                 (browse → compare → activate)
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   MARKETPLACE BACKEND (apps/api)   │◄──── TermiX / other agents
        │  catalog · data merge · hire relay │      call in directly too,
        └───────┬─────────────────┬─────────┘      over ERC-8183 or A2A
                │                 │
                ▼                 ▼
    ┌─────────────────┐   ┌───────────────────────┐
    │ DATA & TRUST     │   │ HIRE RELAY (/hire)     │
    │ 8004scan API +   │   │ → agent's own          │
    │ on-chain reads   │   │   POST /apex/negotiate │
    │ (supabase cache) │   │   or A2A task endpoint │
    └─────────────────┘   └───────────┬────────────┘
                                       ▼
        4 CATEGORY SELLER AGENTS  (agents/, Agent Studio)
     rebalancing · grid_trading · yield_optimization · health_factor
       each = Layer A (AgentCore) + Layer B (EC2/Fargate)
                                       │
                                       ▼
        BNB Smart Chain (ERC-8004, ERC-8183, x402) + A2A off-chain
```

## Repo layout

```
m402/
├── apps/
│   ├── web/      Next.js (App Router) marketplace frontend
│   └── api/      Express/TS backend — catalog, data merge, /hire relay
├── packages/
│   └── shared-types/   AgentCategory model shared by web and api
├── supabase/
│   └── migrations/     agents, hires, advantage_report_tasks, profiles
└── agents/       one folder per category, scaffolded independently via
                  `bag init` (Agent Studio's own Python project layout) —
                  NOT part of the pnpm workspace, talked to only over HTTP
```

`apps/web` + `apps/api` + `packages/shared-types` are a clean TypeScript
monorepo (pnpm workspaces + Turborepo). The four agents are a different
animal — Agent Studio's `bag init` scaffolds its own Python project per
agent, with its own wallet and on-chain identity — so they live outside the
workspace as independent deployments. `apps/api` never imports their code,
only calls their negotiate/A2A endpoints.

## Components

### apps/api — the hire relay
`POST /hire` is the one door both a human on the frontend and an external
agent (TermiX) come through. It looks up the target agent's `negotiate_url`,
opens a `hires` row in Supabase, and proxies the request — see
`apps/api/src/routes/hire.ts`. It currently stubs the actual ERC-8183 quote
envelope (marked with a `TODO(session 2)`); the shape of the flow — request
in, hire record opened, quote or a clear "pending" response out — is real.

`GET /agents` and `GET /agents/:slug` read the catalog straight from
Supabase. `GET /catalog/external` is where 8004scan listings get merged in
once the Pro API key is wired up (session 2).

### supabase — data & trust
Four tables: `agents` (the catalog, including each agent's negotiate URL and
A2A card URL), `hires` (every quote/fund/fulfill/settle lifecycle, from
either a human or an agent), `advantage_report_tasks` (the required TermiX
Agent Advantage Report — at least one row needs `is_high_stakes = true`),
and `profiles` (minimal, layered on Supabase auth for the human hire flow).
RLS is on for all four; the catalog and the Advantage Report are public
read, writes go through the API's service role.

### apps/web — the marketplace itself
Landing page leads with a live settlement ledger (currently illustrative,
client-cycled data — wired to real `GET /hire` history in session 2) instead
of marketing copy, because Data Quality and provable transactions are the
literal scored criteria here, not just a design preference. Category and
agent-detail routes are scaffolded and typed but intentionally stubbed —
full listings and the Activate flow (connect wallet → review quote → fund →
confirmation) are session 2 work once `apps/api` is serving real agents.

Design tokens live in `tailwind.config.ts`: a dark graphite base (not pure
black), an amber accent pulled from the conventional dev-tools color for 4xx
HTTP status codes — a deliberate nod to x402, not a generic crypto-dashboard
purple — and a sage green reserved for settled/verified states.

## Build order

One criterion needs elapsed time, not just engineering time: TermiX's
"high-stakes categories & track record" wants a real win rate over a real
window from a trading agent. Front-load whatever needs to *run*, not just
*be built*.

1. Scaffold the four agents (`agents/*/`, `bag init` each) — **get
   grid_trading executing real trades first**, rebalancing close behind.
2. Apply for 8004scan Pro access early; wire `apps/api`'s `SCAN_8004_API_KEY`.
3. Stand up Supabase from `supabase/migrations/0001_init.sql`; seed the
   `agents` table with each agent's real `negotiate_url` as it comes online.
4. Finish the `/hire` relay's real ERC-8183 (and A2A) envelope handling.
5. Build out the full frontend against real data — category listings,
   agent detail, the Activate flow.
6. Log every real task for the Advantage Report as you go, not after.
7. Confirm public deployment and that `/hire` actually settles a real job —
   TermiX is calling it for real.

## Risks worth naming
- **Single-category depth trap** — Agent Diversity is a third of the
  main-track score; don't let grid_trading eat the time meant for the rest.
- **Track record can't be rushed** — a win rate needs a real window.
- **Mocked data reads as low Data Quality** — the ledger and listings need
  to go real as early as possible, not at the end.
- **The negotiate/A2A endpoint has to actually settle** — TermiX hiring you
  and getting nothing back zeroes out "Value of the services."

## Session handoff
This repo is a git repo from session 1 onward. Each new session, drop the
latest zip back in and I'll pick up from the real committed state rather
than my memory of it — I'll hand back a plain changed-files list (or a real
diff) alongside every subsequent zip.
