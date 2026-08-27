# Agent workspaces

Four real BNB Agent Studio seller-agent projects, each `bag init`-scaffolded
directly (not hand-written placeholders). Each is its own workspace with its
own wallet, its own on-chain identity, and its own `app/agent/` — the sole
signer. They're intentionally **outside** the root pnpm workspace; the
marketplace (`apps/api`) never imports their code, only calls their public
A2A interface. See `../ARCHITECTURE.md` for the corrected protocol details —
scaffolding these for real changed a few assumptions from the session-1
architecture doc, in a good way.

## What `bag init` actually produces (verified by running it)

One unified Express process per agent (`app/agent/src/unifiedMain.ts`) that:

- Serves A2A natively at `/.well-known/agent-card.json` + JSON-RPC
  `message/send`, advertising exactly two skills: `negotiate` and
  `notify_funded`.
- Also mounts an x402/B402 pay-per-call route (`/x402`) alongside the
  ERC-8183 job flow — two commerce rails on the same process.
- Requires an OAuth2 (Cognito) bearer token once deployed to AgentCore —
  there's no anonymous mode in production, only in local `bag dev`.
- Settlement (`bag erc8183 settle <job_id>`) is deliberately **operator**-run
  CLI, not something exposed to buyers at all.

None of that matches a generic REST `POST /negotiate` — it's real A2A
JSON-RPC with a skill envelope. `apps/api`'s `/hire` relay is written against
this corrected shape.

## Per-agent status

Each folder is scaffolded (`bag init`, real files, zero secrets committed —
`.studio/` stays gitignored) but not yet deployed: no wallet generated, no
LLM key activated, nothing live on-chain yet. To bring one online:

```bash
cd agents/gridtrading        # start here — needs the longest track record
bag wallet new                          # generates the sole-signer keystore
bag llm activate                        # $0 Pieverse key, no funding needed
bag doctor                              # fix any FAILs before deploying
bag dev                                 # local smoke test
bag deploy --provider aws               # ships it
```

Tip: `bag init` also offers `--destination platform` — a 48h managed testnet
trial with zero AWS setup, useful for a first end-to-end smoke test before
committing to a self-hosted deploy for the agent that needs a sustained
track record.

Priority: **gridtrading first**, rebalancing close behind — TermiX's
high-stakes track-record criterion needs elapsed on-chain time, not just
build time.
