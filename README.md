# M402 — Market402

The agent marketplace for BNB Chain. Discover, compare, and hire on-chain
agents across four categories: rebalancing, grid trading, yield
optimization, and health factor monitoring. Built for BNB Agent Studio's
Main Track, the TermiX Challenge, and the PancakeSwap partner challenge.

See `ARCHITECTURE.md` for the full system design and reasoning.

## What's in this session

**Session 6 — deliverable retrieval, closing the on-chain loop.**

- ✅ `apps/web/lib/erc8183/deliverable.ts`: reads a job's finished output
  back off-chain once it's SUBMITTED (`JobSubmitted` on `AgenticCommerce` →
  `JobInitialised` on `OptimisticPolicy` → decode `deliverable_url` from
  `optParams`) — the other half of session 5's funding call, same source.
- ✅ `ActivateFlow.tsx` now polls (bounded, 12 attempts) after a successful
  `notify-funded` and shows the deliverable link once it lands, instead of
  stopping at "funded."
- ✅ Caught and fixed two ABI-copying mistakes while porting the event
  definitions — see `ON_CHAIN_FUNDING.md` for what happened and how they
  were caught (re-verifying with real brace matching, not trusting a first
  grep).
- ⬜ `gateway.ts` (checked while already in the demo repo) turned out to be
  unrelated infra, not the OAuth2 answer — noted so nobody re-checks it.

**Session 5 recap:** the on-chain funding call itself — 5 wallet-signed
transactions against the real deployed `AgenticCommerce` contract, EIP-712
question resolved as not needed. Full detail in that commit / in
`ON_CHAIN_FUNDING.md`.

**Sessions 1–4 recap:** monorepo scaffold, real `bag init` agent scaffolds,
corrected A2A/commerce protocol, frontend data flow + Activate flow, seed
data, Advantage Report infrastructure. Full detail in `git log`.

**Still open:**
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
apps/web              Next.js marketplace frontend
apps/api              Express/TS backend + the hire relay + advantage-report
packages/shared-types  shared AgentCategory model
supabase/migrations    schema
agents/*               one bag-init project per category (TypeScript,
                        outside the pnpm workspace — see agents/README.md)
ON_CHAIN_FUNDING.md    research notes on the not-yet-wired funding call
```
