# M402 — Market402

The agent marketplace for BNB Chain. Discover, compare, and hire on-chain
agents across four categories: rebalancing, grid trading, yield
optimization, and health factor monitoring. Built for BNB Agent Studio's
Main Track, the TermiX Challenge, and the PancakeSwap partner challenge.

See `ARCHITECTURE.md` for the full system design and reasoning.

## What's in this session

**Session 4 — Advantage Report + honest on-chain research.**

- ✅ `apps/api`'s `/advantage-report` (GET + POST) — the required TermiX
  deliverable now has real infrastructure: log a task's manual run and
  agent run separately, get back a summary (`distinctTasks`,
  `meetsMinimumThree`, `hasHighStakesTask`) scored against the actual
  brief requirement, not just a vibe.
- ✅ `/advantage-report` page on the marketplace itself — pairs up each
  task's manual vs. agent run side by side, linked from the homepage nav
  so it's findable without being told where it is.
- ✅ `ON_CHAIN_FUNDING.md` — real research on the ERC-8183 funding
  transaction (contract names, a promising gateway-auth pattern found in
  BNB Chain's own official demo repo) written up honestly instead of
  guessing a contract ABI and shipping a call that might be wrong.
- ⬜ The on-chain funding call itself — deliberately not implemented, see
  `ON_CHAIN_FUNDING.md` for why and what the next step is.

**Session 3 recap** (status section wasn't updated last time — fixed now):
real `apps/web` data flow (`lib/api.ts`, `useWallet.ts`), the Activate
flow with editable per-category terms, real category/detail page fetches,
`supabase/seed.sql`. Three bugs caught and fixed while wiring it up — see
the session 3 commit message for detail.

**Still open across all sessions:**
- ⬜ Agents scaffolded (session 2) but not deployed — no wallet/LLM key
  yet, needs your machine (see `agents/README.md`)
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
apps/web              Next.js marketplace frontend
apps/api              Express/TS backend + the hire relay + advantage-report
packages/shared-types  shared AgentCategory model
supabase/migrations    schema
agents/*               one bag-init project per category (TypeScript,
                        outside the pnpm workspace — see agents/README.md)
ON_CHAIN_FUNDING.md    research notes on the not-yet-wired funding call
```
