# gridtrading

## What this agent does (M402)

Places and manages a grid of buy/sell orders on a pair.

**As of this session, this is real, not a pointer to future work.**
`app/agent/src/strategy.ts` implements an actual grid check-and-trade
cycle against PancakeSwap V3 on BSC testnet — real, independently-verified
contract addresses (see the file's own header comments for exactly what
was confirmed vs. what still needs a final check), a real price read via
the pool's `slot0()`, and real trade execution through the wallet's own
`makeExecutor()`/`execute(Intent)` seam (the same write path
`@bnbagent/sdk` uses internally — confirmed by reading its compiled
source, not assumed). `sellerCore.ts`'s `doWorkAndSubmit` now runs this
for real before the LLM ever produces text; the model's job is downgraded
to narrating a real result, never inventing one.

**Required before this does anything:** set `GRID_CONFIG_JSON` (tokenA,
tokenB, fee, lowerPrice, upperPrice, gridLevels, orderSizeWei as a JSON
string) in the environment. No default token addresses are guessed here —
see `strategy.ts`'s `runGridCheck()` for why that's deliberate. Without it,
the deliverable honestly reports "not configured" instead of fabricating
a plan.

**Reports real stats back to the marketplace, if configured.** Set
`M402_API_URL` and `M402_AGENT_ID` (this agent's row id in M402's own
`agents` table) and every executed trade posts to `POST
/agents/:id/stats` — `totalTrades` and `activeSince` accumulate for real.
`winRatePct`/`realizedPnlUsd` stay `null` on purpose: this agent has no
cost-basis tracking yet, and a fabricated-looking number would be worse
than an honest gap — see `reportStatsToMarketplace()`'s own comment.
Missing either env var just skips reporting silently; it never blocks the
trade itself.

**Validated this session:** `npm install` + `npx tsc --noEmit` +
`npm run build` all ran clean against the real installed
`@bnbagent/sdk`/`@bnbagent/studio-runtime` types — not just eyeballed.
**Not yet validated:** this has never executed against a live wallet or
real testnet liquidity. The `amountOutMinimum: 0n` in `strategy.ts` is a
real gap (zero slippage protection) flagged with a `TODO`, not hidden —
fix before this ever touches funds that matter.

- **Highest-priority agent to get live first.** TermiX's "high-stakes
  categories & track record" criterion needs a real win rate over a real
  window — that only accumulates with time on-chain, not build time. `bag
  deploy --provider aws` this one before the others.


A BNB Chain seller agent workspace scaffolded by `bag init` (bnbagent-studio).

- `app/agent/` — the valuable Agent + SOLE on-chain signer (TypeScript, `src/`).
- `.studio/` — secrets (encrypted keystore + .env.local); NEVER commit it.
- `bag dev` — run the agent locally; `bag doctor` — readiness checks.
- `bag deploy --provider aws` — deploy to AWS Bedrock AgentCore (uses the self-rendered `agentcore/` descriptor).

In Claude Code / Cursor, type `/bnbagent-studio` — the skill drives every step.
