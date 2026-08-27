# gridtrading

## What this agent does (M402)

Places and manages a grid of buy/sell orders on a pair.

- Bring in PancakeSwap swap execution (`pancakeSwap` from bsc-mcp) + your own
  grid state machine.
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
