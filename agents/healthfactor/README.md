# healthfactor

## What this agent does (M402)

Watches lending positions (Venus/Aave V3) and alerts or acts before
liquidation.

- Reads: health factor per monitored position.
- Action: a protective response (repay / add collateral), bounded by the
  `[payments.erc8183]` price/clamp config and whatever spend cap you set —
  this agent should never be able to move more than its owner authorized.


A BNB Chain seller agent workspace scaffolded by `bag init` (bnbagent-studio).

- `app/agent/` — the valuable Agent + SOLE on-chain signer (TypeScript, `src/`).
- `.studio/` — secrets (encrypted keystore + .env.local); NEVER commit it.
- `bag dev` — run the agent locally; `bag doctor` — readiness checks.
- `bag deploy --provider aws` — deploy to AWS Bedrock AgentCore (uses the self-rendered `agentcore/` descriptor).

In Claude Code / Cursor, type `/bnbagent-studio` — the skill drives every step.
