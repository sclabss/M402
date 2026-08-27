# M402 (Market402) — Architecture

*Scope: Main Track + TermiX Challenge + PancakeSwap Challenge*

## What this is

M402 is the buyer-side marketplace BNB Agent Studio doesn't ship yet — Agent
Studio's own tooling is explicitly seller-only right now (buyer flows and a
hosted console are planned for a later release). Every agent it deploys
already speaks A2A natively, holds an on-chain ERC-8004 identity, and offers
ERC-8183 job-based commerce as two of its A2A skills. M402 is the place a
person — or another agent — comes to find, compare, and hire those agents
across four categories: rebalancing, grid trading, yield optimization, and
health factor monitoring.

## One door in (A2A), two commerce rails

> **Corrected against a real scaffold.** The paragraph below replaced an
> earlier draft that assumed a two-service "Layer A / Layer B" split and a
> bespoke `POST /apex/negotiate` REST endpoint. Running the actual `bag
> init` and reading the generated `unifiedMain.ts` showed something simpler
> and better: **one** process per agent, and negotiation happens *inside*
> A2A, not next to it. Fixing this on contact rather than shipping the
> earlier assumption is the point of validating instead of guessing — see
> `agents/README.md` for exactly what changed.

Each agent is a single deployed process (built from `app/agent/`, one
codebase that runs unmodified on either AWS Bedrock AgentCore or Azure AI
Foundry) that exposes:

- **A2A** — a signed Agent Card at `/.well-known/agent-card.json`, and JSON-RPC
  `message/send` at the agent's own URL. The card advertises exactly two
  skills: `negotiate` (send a task description + terms, get back a
  wallet-signed price quote) and `notify_funded` (tell the seller a job is
  funded on-chain; it acks at once and delivers in the background). A2A
  reached a stable v1.0 release under Linux Foundation governance. This one
  interface is what 8004scan-style discovery and TermiX both call — there's
  no separate "BNB-native path" to build.
- **ERC-8183** — the commerce rail those two A2A skills actually run: buyer
  negotiates → buyer funds the quoted job on-chain themselves (a real wallet
  transaction, `createJob` + `fund` — not something either side's API does
  on the other's behalf) → buyer calls `notify_funded` → seller delivers and
  submits the result on-chain → the buyer reads the deliverable back **from
  the chain**, not from any HTTP response. Settlement after the dispute
  window is deliberately operator-run CLI (`bag erc8183 settle`), never a
  buyer-facing call.
- **x402 / B402** — a second, parallel pay-per-call route (`/x402`) mounted
  on the same process, for simple metered requests that don't need the full
  job lifecycle. Priced separately in `studio.toml`.

One agent, one A2A door, two ways to pay through it. M402's job is to make
that one door easy to find and use from a marketplace UI — not to build a
second one.

## System overview

```
                    MARKETPLACE FRONTEND  (apps/web)
                 (browse → compare → activate)
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   MARKETPLACE BACKEND (apps/api)   │◄──── TermiX / other A2A
        │  catalog · data merge · hire relay │      clients call in too
        └───────┬─────────────────┬─────────┘
                │                 │
                ▼                 ▼
    ┌─────────────────┐   ┌────────────────────────────┐
    │ DATA & TRUST     │   │ HIRE RELAY                  │
    │ 8004scan API +   │   │ /hire            → negotiate│
    │ on-chain reads   │   │ /hire/:id/notify-funded     │
    │ (supabase cache) │   │   both via A2A message/send │
    └─────────────────┘   └──────────────┬───────────────┘
                                          ▼
        4 CATEGORY SELLER AGENTS  (agents/, bag init)
     rebalancing · gridtrading · yieldoptimization · healthfactor
       each = ONE process (unifiedMain.ts), A2A + x402 faces,
              deployed to AgentCore — verified via a real scaffold
                                          │
                                          ▼
      BNB Smart Chain (ERC-8004 identity, ERC-8183 job settlement)
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
└── agents/       one bag-init project per category (rebalancing,
                  gridtrading, yieldoptimization, healthfactor) —
                  each independently deployed, talked to only over A2A
```

`apps/web` + `apps/api` + `packages/shared-types` are a clean TypeScript
monorepo (pnpm workspaces + Turborepo). The four agents are *also*
TypeScript — `bag init` scaffolds Node/TS, not Python, correcting an
assumption in an earlier draft of this doc — but they still live outside
this workspace: each is its own `bag`-managed project with its own
`pnpm-workspace.yaml`, its own wallet, and its own independent deploy
lifecycle to AgentCore. Folding four independently-deployed, independently-
versioned projects into one pnpm workspace would fight the tool, not help
it. `apps/api` never imports their code, only calls their A2A endpoint.

## Components

### apps/api — the hire relay
`POST /hire` is the one door both a human on the frontend and an external
agent (TermiX) come through. It looks up the target agent's `a2a_url`, opens
a `hires` row in Supabase, and sends a real A2A `message/send` JSON-RPC
request carrying the `negotiate` skill as a DataPart — shape verified
against `@a2a-js/sdk`'s own types, not guessed. `POST
/hire/:id/notify-funded` is the second real step, sent once the buyer has
funded the job on-chain themselves; see `apps/api/src/routes/hire.ts` for
both, including the honest `TODO` on OAuth2 (deployed AgentCore agents
require a Cognito bearer token — that exchange isn't wired up yet).

`GET /agents` and `GET /agents/:slug` read the catalog straight from
Supabase. `GET /catalog/external` is where 8004scan listings get merged in
once the Pro API key is wired up (session 2+).

### supabase — data & trust
Four tables: `agents` (the catalog, including each agent's single `a2a_url`),
`hires` (every negotiate/fund/notify/deliver step, from either a human or an
agent, including the `negotiation_hash` and `erc8183_job_id` needed to track
a real job), `advantage_report_tasks` (the required TermiX Agent Advantage
Report — at least one row needs `is_high_stakes = true`), and `profiles`
(minimal, layered on Supabase auth for the human hire flow). RLS is on for
all four; the catalog and the Advantage Report are public read, writes go
through the API's service role.

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

1. Bring the four agents online (`agents/*/`, already `bag init`-scaffolded
   — see `agents/README.md` for the remaining `bag wallet new` / `bag llm
   activate` / `bag deploy` steps) — **get gridtrading executing real trades
   first**, rebalancing close behind.
2. Apply for 8004scan Pro access early; wire `apps/api`'s `SCAN_8004_API_KEY`.
3. Stand up Supabase from `supabase/migrations/0001_init.sql`; seed the
   `agents` table with each agent's real `a2a_url` as it comes online.
4. Wire up the OAuth2 client-credentials exchange the `/hire` relay's `TODO`
   flags — needed before it can reach a deployed (non-local) agent.
5. Build out the full frontend against real data — category listings,
   agent detail, the Activate flow (including the on-chain funding step,
   which has to be a real wallet transaction the frontend prompts).
6. Log every real task for the Advantage Report as you go, not after.
7. Confirm public deployment and that `/hire` actually settles a real job —
   TermiX is calling it for real.

## Risks worth naming
- **Single-category depth trap** — Agent Diversity is a third of the
  main-track score; don't let gridtrading eat the time meant for the rest.
- **Track record can't be rushed** — a win rate needs a real window.
- **Mocked data reads as low Data Quality** — the ledger and listings need
  to go real as early as possible, not at the end.
- **The A2A negotiate/notify_funded flow has to actually settle** — TermiX
  hiring you and getting nothing back zeroes out "Value of the services."
- **OAuth2 is a real prerequisite, not a nice-to-have** — a deployed agent
  won't accept an unauthenticated `/hire` call; budget time for the Cognito
  client-credentials exchange, don't discover it at demo time.

## Session handoff
This repo is a git repo from session 1 onward. Each new session, drop the
latest zip back in and I'll pick up from the real committed state rather
than my memory of it — I'll hand back a plain changed-files list (or a real
diff) alongside every subsequent zip.
