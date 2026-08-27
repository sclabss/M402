# The ERC-8183 on-chain funding call — resolved

Was open research as of session 4. Now implemented in
`apps/web/lib/erc8183/` and wired into `ActivateFlow.tsx`. This file is the
record of how it got resolved, kept for the same reason session 2's
correction was called out explicitly rather than silently overwritten.

## What was verified, and how

Cloned `bnb-chain/stockanalyst-agent-demo` (BNB Chain's own official
end-to-end reference) and read `buyer-client/src/erc8183.ts` and its ABI
files directly, rather than reconstructing the interface from the spec or
guessing. That gave real, deployed BSC-testnet contract addresses and exact
ABIs for `AgenticCommerce`, `EvaluatorRouter`, `OptimisticPolicy`, and the
`U` ERC-20 — now copied into `apps/web/lib/erc8183/abi.ts` and
`contracts.ts` with attribution comments.

**The real flow turned out to be five transactions, not two:** `createJob`
→ `registerJob` (bind the policy on the Router) → `setBudget` → ERC-20
`approve` → `fund`. The earlier "createJob + fund" framing in session 3's
placeholder text undersold it. `apps/web/lib/erc8183/buyer.ts` implements
all five, adapted from the demo's `ERC8183Buyer.buy()` — same calls, same
order, the one real change being that the demo signs with a server-held
private key (`ethers.Wallet`) and this signs with the buyer's own connected
wallet (`ethers.BrowserProvider` over `window.ethereum`), since a
marketplace can't and shouldn't hold a human buyer's key.

**The EIP-712 `notify_funded` question from session 4 is resolved as "not
needed":** the demo's `notify-auth.ts` does sign an EIP-712
`NotifyFunded` payload, but its own domain is named
`"stockanalyst-notify-funded"` — clearly specific to that app's own extra
authorization layer for its sensitive delivery context (portfolio
holdings, risk profile), not a base protocol requirement. Checked directly
against our own scaffolded agents' generated source
(`agents/*/app/agent/src/agentCard.ts`) to confirm: the `notify_funded`
skill we actually deployed only expects
`{"skill": "notify_funded", "job_id": <int>}`. No EIP-712 needed for M402.
`apps/api/src/routes/hire.ts`'s existing implementation was already correct.

## What's still open

- **Not tested against a live chain** — no deployed agent to actually
  negotiate with yet (needs the steps in `agents/README.md` first), so this
  is verified-by-reading-real-source, not verified-by-running. `bag doctor`
  / a real `bag dev` agent is the natural next check once one exists.
- **Deliverable retrieval** (reading the finished work back off-chain once
  a job reaches SUBMITTED) isn't implemented — the demo does it by parsing
  JSON out of a `JobInitialised` event's `optParams` on the Policy
  contract, using a separate archive RPC because standard BSC testnet
  data-seed nodes block `eth_getLogs`. Real, but a separate piece of work.
- **`settle()`** (claiming payment after the dispute window) is
  deliberately operator-run CLI per the agent's own card, not wired into
  the buyer-facing UI — correctly out of scope here.
