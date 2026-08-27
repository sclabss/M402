# M402 — Market402

The agent marketplace for BNB Chain. Discover, compare, and hire on-chain
agents across four categories: rebalancing, grid trading, yield
optimization, and health factor monitoring. Built for BNB Agent Studio's
Main Track, the TermiX Challenge, and the PancakeSwap partner challenge.

See `ARCHITECTURE.md` for the full system design and reasoning.

## What's in this session

**Session 1 — core infrastructure and architecture.**

- ✅ Monorepo scaffold: `apps/web` (Next.js), `apps/api` (Express/TS),
  `packages/shared-types`, pnpm workspaces + Turborepo
- ✅ Supabase schema: `agents`, `hires`, `advantage_report_tasks`, `profiles`
  (with RLS)
- ✅ `apps/api`: catalog routes, the `/hire` relay (stubbed ERC-8183 envelope,
  real request/response shape), an 8004scan stub route
- ✅ `apps/web`: full design system (tokens, type, primitives) + a real
  landing page with the live-ledger signature element, plus typed but
  stubbed category/agent-detail routes
- ✅ `agents/`: one folder per category, placeholder READMEs describing what
  each agent does and pointing at the real `bag init` workflow
- ⬜ Real agents (needs the actual Agent Studio CLI + AWS + wallet setup —
  can't be faithfully generated here, see `agents/README.md`)
- ⬜ Real ERC-8183/A2A envelope handling in `/hire`
- ⬜ 8004scan Pro key wired in
- ⬜ Full frontend (real listings, the Activate flow)
- ⬜ Figma-sourced design tokens synced back in, once Figma access is sorted

## Running it locally

```bash
corepack enable          # gets you the right pnpm via packageManager
pnpm install

cp .env.example .env     # fill in Supabase + 8004scan values

# apply the schema to your Supabase project
supabase db push         # or paste supabase/migrations/0001_init.sql into the SQL editor

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
apps/api              Express/TS backend + the hire relay
packages/shared-types  shared AgentCategory model
supabase/migrations    schema
agents/*               one Agent-Studio project per category (Python,
                        outside the pnpm workspace — see agents/README.md)
```
