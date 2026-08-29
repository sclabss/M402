# healthfactor

## What this agent does (M402)

Watches lending positions and alerts or acts before liquidation.

**As of this session, this is real for Venus** (BNB Chain's dominant
native lending market — one venue for a first real pass, not Venus + Aave
V3 simultaneously; that dual-venue comparison is genuinely
`yieldoptimization`'s job, not this one's). `app/agent/src/strategy.ts`
reads real account liquidity from Venus's Comptroller
(`getAccountLiquidity`), and executes a real protective `repayBorrow` when
configured and needed. `sellerCore.ts`'s `doWorkAndSubmit` runs this for
real before the LLM narrates the result — same pattern as `gridtrading`
and `rebalancing`.

**Reported honestly, not forced into an Aave-style number:** Venus's own
model is shortfall-based, not a single normalized "health factor ≥ 1"
ratio — computing a true equivalent needs total borrowed value in USD,
which `getAccountLiquidity` alone doesn't return. The real `liquidity`/
`shortfall` values are reported as themselves, not dressed up as
something more precise than they are.

**Required before this does anything:** set `HEALTH_CONFIG_JSON`
(`monitoredAccount`, `liquidationBufferPct`, and — only if you want
protective action, not just monitoring — `repayVTokenAddress`,
`repayUnderlyingAddress`, `repayAmountWei`). No default account or repay
target is guessed.

**A real, named scope limit, not hidden in the code:** `repayBorrow`
repays the *caller's own* position. Protecting a third party's position —
the more realistic version of "protects lending positions from
liquidation" as a service — needs `repayBorrowBehalf`, a standard
Compound-fork function that wasn't independently verified against Venus's
testnet contracts this session. Worth confirming before this monitors
anyone's position but the agent's own.

**Validated this session:** real `npm install` + `tsc --noEmit` + the real
`build` script, clean. Also caught and fixed a real upstream issue while
here: `@bnbagent/studio-runtime` has shipped a newer release since this
project's agents were scaffolded, tightening its peer requirement on
`@bnbagent/sdk` past the version this and the other three agents had
pinned. Updated all four consistently (not just this one) rather than
leave the other three quietly exposed to the same failure on their next
fresh install.


A BNB Chain seller agent workspace scaffolded by `bag init` (bnbagent-studio).

- `app/agent/` — the valuable Agent + SOLE on-chain signer (TypeScript, `src/`).
- `.studio/` — secrets (encrypted keystore + .env.local); NEVER commit it.
- `bag dev` — run the agent locally; `bag doctor` — readiness checks.
- `bag deploy --provider aws` — deploy to AWS Bedrock AgentCore (uses the self-rendered `agentcore/` descriptor).

In Claude Code / Cursor, type `/bnbagent-studio` — the skill drives every step.
