# M402 — Market402

The agent marketplace for BNB Chain. Discover, compare, and hire on-chain
agents across four categories: rebalancing, grid trading, yield
optimization, and health factor monitoring. Built for BNB Agent Studio's
Main Track, the TermiX Challenge, and the PancakeSwap partner challenge.

See `ARCHITECTURE.md` for the full system design and reasoning.

## What's in this session

**Session 12 — marketplace can actually help someone find a good agent
now, not just list them.**

Prompted directly by feedback that the platform needs to be useful for
*finding* good agents, not just hiring whichever one you land on. Checked
first rather than assumed: `agents.live_stats` had existed as a schema
column and a type field since session 1, and **nothing in `apps/web` ever
read or rendered it** — a real, confirmed gap, not a guess.

- ✅ Real category-specific stats types in `shared-types`
  (`RebalancingStats`, `GridTradingStats`, `YieldOptimizationStats`,
  `HealthFactorStats`) instead of the old untyped `Record<string, number
  | string>` — the right numbers per category, not a generic dump.
- ✅ `POST /agents/:id/stats` — the real endpoint for an agent to report
  its own performance, validated against the agent's actual category so a
  miswired report can't silently corrupt another category's data.
- ✅ `GET /agents?sort=performance` — ranks by each category's own primary
  metric (win rate for grid trading, time-in-range for rebalancing, etc.).
  No track record sorts last, not hidden — a new agent with no history is
  real information, not a gap to paper over.
- ✅ Stats now actually render: a compact badge on every `AgentCard`, a
  full breakdown on the agent detail page, a sort toggle on category pages.
- ✅ Split reputation from performance, a modeling mistake caught by
  typecheck, not planning: 8004scan's star rating and M402's own
  performance track record are different *kinds* of data (trust signal vs.
  results), and the first draft tried to cram both into one field —
  `tsc` refused, correctly. Added a separate `reputationStats` field
  instead of loosening the type back to something permissive.
- ✅ Closed the loop for one agent: `gridtrading` now reports real
  `totalTrades`/`activeSince` back to the marketplace after each executed
  trade. Honest about the limit — `winRatePct`/`realizedPnlUsd` stay
  `null` on purpose, since this agent has no cost-basis tracking yet, and
  a plausible-looking fabricated number would be worse than an honest gap.
- ✅ Validated the same way as sessions 10–11: real `npm install` +
  `tsc --noEmit` + the real `build` script for `gridtrading`, plus the
  full monorepo typecheck/build. Two real type errors caught and fixed in
  the process (see the commit message), not just the one modeling mistake
  above.
- ⬜ `rebalancing` doesn't report stats back yet — same mechanism, not
  wired in this session.
- ⬜ `yieldoptimization` and `healthfactor` still have no real logic at
  all, so nothing to report regardless.

**Session 11 recap:** real rebalancing strategy; 2 of 4 agents now do real
work.

Continuing session 10's pattern directly, not starting over:

- ✅ `agents/rebalancing/app/agent/src/strategy.ts` — real PancakeSwap V3
  LP rebalancing: reads the pool's current tick, compares to the
  position's range, executes a real 3-transaction rebalance
  (`decreaseLiquidity` → `collect` → `mint`) when price has drifted near
  an edge. New contract verified this session (`NonfungiblePositionManager`);
  Factory reused from session 10 rather than re-verified from scratch.
- ✅ **Caught and fixed a real functional gap before it shipped, not after:**
  the first draft of the `mint` step used `amountOutDesired: 0n`, which
  would've minted a completely empty (zero-liquidity) position — a more
  serious issue than gridtrading's slippage gap, since the operation would
  "succeed" (3 real transactions) while producing nothing useful. Fixed by
  simulating the `collect` call to get real expected amounts before using
  them, after confirming a mined transaction's receipt can't carry a
  contract function's return value at all (an EVM fact, checked against
  the SDK's actual `TxResult` type rather than assumed).
- ✅ Flagged a real address discrepancy rather than picking one silently: a
  community doc's `NonfungiblePositionManager` address is independently
  corroborated by BscScan's own testnet page, but the *same* doc's
  SmartRouter address conflicts with what session 10 already verified
  directly. Documented as "treating the doc as partially stale," not
  hidden.
- ✅ Same validation discipline as session 10: real `npm install` against
  `@bnbagent/sdk`, `tsc --noEmit` and the real `build` script both clean.
- ⬜ `yieldoptimization` and `healthfactor` still need this treatment, and
  unlike `rebalancing` (which reused `gridtrading`'s already-verified
  PancakeSwap infrastructure), they need genuinely new protocol research —
  Venus and Aave V3 contracts haven't been touched yet. Deliberately not
  rushed in this session to hit "4 of 4" — see the note at the end of this
  entry.
- ⬜ Still never run against a live wallet, same blockers as every prior
  session (SIWE, AWS credentials).

**Session 10 recap:** the first real agent — `gridtrading`'s grid-trading
strategy, same verification discipline, closing `AUDIT.md`'s biggest
finding for one of four agents.

**Session 9 recap:** the audit itself — `AUDIT.md`, honest about what's
real vs. scaffolded vs. hallucinated-and-caught.

**Sessions 1–8 recap:** monorepo scaffold, real `bag init` agent
scaffolds, corrected A2A/commerce protocol, frontend data flow + Activate
flow, on-chain funding + deliverable retrieval, real 8004scan integration,
deployment config. Full detail in `git log`.

**Why this session, specifically:** the brief's eligibility section
requires the submission be "functional and publicly accessible during
judging" — seven sessions of feature work hadn't touched deployment for
the marketplace itself at all.

**Session 7 recap:** real 8004scan integration, live-tested and corrected
against the actual API (not just its docs); independent cross-verification
of the ERC-8183 contract addresses via `@bnbagent/sdk`'s own registry.

**Sessions 1–6 recap:** monorepo scaffold, real `bag init` agent
scaffolds, corrected A2A/commerce protocol, frontend data flow + Activate
flow, seed data, Advantage Report infrastructure, real on-chain funding +
deliverable retrieval. Full detail in `git log`.
data, Advantage Report infrastructure. Full detail in `git log`.

**Still open:**
- ⬜ Deploying for real — config is written (`DEPLOYMENT.md`), not yet run
- ⬜ Agents scaffolded but not deployed — no wallet/LLM key yet, needs your
  machine (see `agents/README.md`)
- ⬜ OAuth2 client-credentials exchange for calling a *deployed* agent
- ⬜ 8004scan Pro key wired in
- ⬜ Figma-sourced design tokens, once Figma access is sorted

Full session-by-session detail is in `git log` — each commit message is a
real changelog, not just a label.

## Running it locally

```bash
corepack enable          # gets you the right pnpm via packageManager
pnpm install

cp .env.example .env     # fill in Supabase + 8004scan values

# apply the schema to your Supabase project
supabase db push         # or paste supabase/migrations/0001_init.sql into the SQL editor
supabase db execute -f supabase/seed.sql   # optional: demo data for all 4 categories

pnpm dev                 # runs apps/web and apps/api together via turbo
```

`apps/web` defaults to `localhost:3000`, `apps/api` to `localhost:4000`
(`PORT` in `.env`).

## Session workflow

This repo is a real git repo, committed at the end of every session. Because
my access to files only lasts within a single conversation, the handoff is:

1. You unzip this and, if you want, poke at it / commit it to your own
   remote.
2. Next session: drop the current zip back in at the start of the chat.
3. I unpack it, `git log`/`git diff` against what I remember building, and
   work from the real state — not a guess.
4. Each session's output is a new zip, plus a plain list of what changed.

## Repo layout

```
apps/web               Next.js marketplace frontend (+ vercel.json)
apps/api               Express/TS backend + the hire relay + advantage-report
                        (+ Dockerfile, .dockerignore)
packages/shared-types   shared AgentCategory model
supabase/migrations     schema
agents/*                one bag-init project per category (TypeScript,
                         outside the pnpm workspace — see agents/README.md)
.github/workflows/ci.yml   typecheck + build on every push/PR
DEPLOYMENT.md           how to actually put apps/web + apps/api online
ON_CHAIN_FUNDING.md     the ERC-8183 buyer flow: research, then verified
                        and implemented (funding + deliverable retrieval)
```
