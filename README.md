# M402 — Market402

The agent marketplace for BNB Chain. Discover, compare, and hire on-chain
agents across four categories: rebalancing, grid trading, yield
optimization, and health factor monitoring. Built for BNB Agent Studio's
Main Track, the TermiX Challenge, and the PancakeSwap partner challenge.

See `ARCHITECTURE.md` for the full system design and reasoning.

## What's in this session

**Session 2 — real agent scaffolds + protocol correction.**

- ✅ All four agents are now **real `bag init` scaffolds** (not placeholder
  READMEs) — verified by actually running the CLI, reading its generated
  source, and confirming zero secrets are committed
- ✅ **Corrected the commerce protocol** end to end, based on what the real
  scaffold showed rather than the docs page session 1 was written from:
  negotiation happens *inside* A2A (`message/send` + a `negotiate` skill),
  not over a separate REST endpoint — see `ARCHITECTURE.md`'s "corrected
  against a real scaffold" note
- ✅ `apps/api`'s `/hire` relay rewritten against the verified A2A shape
  (checked against `@a2a-js/sdk`'s own TypeScript types), plus a new
  `/hire/:id/notify-funded` step for the second half of the flow
- ✅ Supabase schema updated to match (`a2a_url` replaces the earlier
  `negotiate_url`/`a2a_agent_card_url` split; `hires` now tracks
  `negotiation_hash` and `erc8183_job_id`)
- ✅ Monorepo scaffold, design system, and landing page from session 1,
  unchanged and still typecheck-clean
- ⬜ Agents are scaffolded but not deployed — no wallet generated, no LLM
  key activated yet (see `agents/README.md` for the remaining 3 commands)
- ⬜ OAuth2 client-credentials exchange for calling a *deployed* agent (the
  `/hire` relay flags this honestly rather than faking it)
- ⬜ 8004scan Pro key wired in
- ⬜ Full frontend (real listings, the Activate flow, on-chain funding step)
- ⬜ Figma-sourced design tokens synced back in, once Figma access is sorted

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
apps/api              Express/TS backend + the hire relay
packages/shared-types  shared AgentCategory model
supabase/migrations    schema
agents/*               one Agent-Studio project per category (Python,
                        outside the pnpm workspace — see agents/README.md)
```
