# rebalancing

## What this agent does (M402)

Watches a PancakeSwap V3 LP position and resets the range when price drifts
out of it.

- Bring in PancakeSwap tools (`pancakeMyPosition`, `pancakeAddLiquidity`,
  `pancakeRemovePosition`) from bsc-mcp — https://github.com/TermiX-official/bsc-mcp
  — inside `app/agent/src/tools.ts` (read-only) and the delivery step in
  `sellerCore.ts`/the runWork hook in `unifiedMain.ts` (the only place
  writes/signing happen, per the file's own boundary comments).
- Also the most direct route to the PancakeSwap partner challenge, alongside
  yieldoptimization.


A BNB Chain seller agent workspace scaffolded by `bag init` (bnbagent-studio).

- `app/agent/` — the valuable Agent + SOLE on-chain signer (TypeScript, `src/`).
- `.studio/` — secrets (encrypted keystore + .env.local); NEVER commit it.
- `bag dev` — run the agent locally; `bag doctor` — readiness checks.
- `bag deploy --provider aws` — deploy to AWS Bedrock AgentCore (uses the self-rendered `agentcore/` descriptor).

In Claude Code / Cursor, type `/bnbagent-studio` — the skill drives every step.
