# Wiring the real ERC-8183 funding transaction — research notes

The `/hire` relay handles negotiate and notify-funded (both real A2A calls).
The one step still not wired into the frontend is the middle one: the buyer
actually funding the negotiated job on-chain. This file is what I verified
before deciding NOT to guess at a contract ABI and bolt in a call that might
be wrong — writing a wrong `createJob`/`fund` call would be worse than
leaving this documented and open.

## What's confirmed

- The ERC-8183 stack is three contracts (per `bnbagent-sdk`'s own docs):
  **AgenticCommerce** (the kernel — owns job state and escrow),
  **EvaluatorRouter** (binds each job to a policy; `settle(jobId)` is
  permissionless and pulls the verdict through here), and
  **OptimisticPolicy** (the reference policy — silence past the dispute
  window is implicit approval; a client-raised dispute triggers a
  whitelisted-voter quorum).
- Funding uses the `$U` token (or `USD1` in some configs) — an ERC-20
  approve + the funding call, not a raw BNB transfer.
- A real, official end-to-end reference exists:
  `bnb-chain/stockanalyst-agent-demo` on GitHub, with a working
  `buyer-client`. That's the thing to clone and read line-by-line before
  writing the frontend contract call — better than reverse-engineering it
  from this summary.
- That demo's `.env` implies **agents deployed to the managed "platform"
  destination are reached through a gateway**, not directly at their own
  AgentCore URL: `AGENT_ENDPOINT=https://bnbagent-api.bnbchain.world/v1/rt/<agent_id>/a2a`,
  authenticated with `AGENT_CLIENT_ID`/`AGENT_CLIENT_SECRET` rather than
  raw Cognito. If that generalizes, it may be a *simpler* path to
  production auth than the Cognito client-credentials flow in `apps/api`'s
  `/hire` TODO — worth checking before implementing that TODO the hard way.
- That same demo hints `notify_funded` may need more than a bare `job_id`:
  "its existing job-creation wallet signs that exact string as EIP-712
  typed data" alongside the call. `apps/api/src/routes/hire.ts`'s
  `/hire/:id/notify-funded` currently sends only `job_id` — this may need
  an EIP-712 signature added once confirmed against the real demo code.

## What's still open

- The exact `AgenticCommerce` ABI (function signatures for the funding
  call, event names) — not yet pulled from a verified source.
- Whether the gateway-URL pattern above is universal or specific to
  `--destination platform` deployments (a `--destination self` deploy may
  be reachable directly at its own AgentCore/Azure URL instead).
- Deployed contract addresses per network (testnet vs. mainnet).

## Recommended next step

Clone `bnb-chain/stockanalyst-agent-demo`, read `buyer-client` end to end,
and port its funding + notify_funded logic into
`apps/web/components/ActivateFlow.tsx` (swap the current placeholder job-id/
tx-hash inputs for a real `viem` `writeContract` call) and into
`apps/api/src/routes/hire.ts`'s notify-funded handler (add the EIP-712 step
if the demo confirms it's required). That demo is a better source of truth
than anything guessed here.
