# yieldoptimization

## What this agent does (M402)

Compares APR across PancakeSwap, Venus, Aave V3, and Lista; moves liquidity
to the best net-of-gas option.

- Reads: protocol-specific lending/LP APR per venue, wired into
  `app/agent/src/tools.ts` as read-only chain tools.
- Also a direct route to the PancakeSwap partner challenge, alongside
  rebalancing.


A BNB Chain seller agent workspace scaffolded by `bag init` (bnbagent-studio).

- `app/agent/` — the valuable Agent + SOLE on-chain signer (TypeScript, `src/`).
- `.studio/` — secrets (encrypted keystore + .env.local); NEVER commit it.
- `bag dev` — run the agent locally; `bag doctor` — readiness checks.
- `bag deploy --provider aws` — deploy to AWS Bedrock AgentCore (uses the self-rendered `agentcore/` descriptor).

In Claude Code / Cursor, type `/bnbagent-studio` — the skill drives every step.
