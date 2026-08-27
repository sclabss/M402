# rebalancing

## What this agent does (M402)

Watches a PancakeSwap V3 LP position and resets the range when price drifts
out of it.

**As of this session, this is real.** `app/agent/src/strategy.ts`
implements an actual rebalance check against a real PancakeSwap V3
position — reads the pool's current tick, compares it to the position's
range, and if price has drifted near an edge, executes a real three-
transaction rebalance (`decreaseLiquidity` → `collect` → `mint` a new
position centered on the current price). `sellerCore.ts`'s
`doWorkAndSubmit` runs this for real before the LLM narrates the result —
same pattern as the `gridtrading` agent.

**Required before this does anything:** set `REBALANCE_CONFIG_JSON`
(tokenA, tokenB, fee, positionTokenId — `null` for a fresh mint,
rangeWidthPercent, driftThresholdPercent) in the environment. No default
addresses or an assumed existing position are guessed — see
`sellerCore.ts`'s `runRebalanceCheck()`.

**Validated this session:** `npm install` against the real
`@bnbagent/sdk`, then both `tsc --noEmit` and the real `build` script,
clean. **Not yet validated:** never executed against a live wallet. Two
real gaps flagged with `TODO`s in the code, not hidden: zero slippage
protection on the mint step, and the `NonfungiblePositionManager` address
was corroborated by BscScan's testnet explorer but not independently
bytecode-verified against the Factory it should point to (a same-source
community doc gave a *different*, seemingly stale, SmartRouter address
alongside it — worth a final on-chain sanity check before real funds).

- Also the most direct route to the PancakeSwap partner challenge, alongside
  yieldoptimization.


A BNB Chain seller agent workspace scaffolded by `bag init` (bnbagent-studio).

- `app/agent/` — the valuable Agent + SOLE on-chain signer (TypeScript, `src/`).
- `.studio/` — secrets (encrypted keystore + .env.local); NEVER commit it.
- `bag dev` — run the agent locally; `bag doctor` — readiness checks.
- `bag deploy --provider aws` — deploy to AWS Bedrock AgentCore (uses the self-rendered `agentcore/` descriptor).

In Claude Code / Cursor, type `/bnbagent-studio` — the skill drives every step.
