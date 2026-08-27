# The ERC-8183 on-chain buyer flow — funding and delivery, resolved

Was open research as of session 4. Funding got implemented in session 5;
deliverable retrieval in session 6. Both now live in
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

**Deliverable retrieval (session 6):** once a job reaches SUBMITTED, the
finished work isn't returned by any API call — it's read off-chain, by
finding the `JobSubmitted` block on `AgenticCommerce` (`apps/web/lib/
erc8183/deliverable.ts`'s `findSubmitBlock`), then reading the
`JobInitialised` event that same window emits on `OptimisticPolicy` and
JSON-decoding its `optParams` bytes for a `deliverable_url` field. Needs a
*second*, separate provider from the wallet's own — standard BSC testnet
data-seed nodes reject `eth_getLogs`, confirmed by the official demo
needing its own `BSC_LOG_RPC_URL` with no built-in default. `ActivateFlow`
polls (bounded, 12 attempts) after a successful `notify_funded` rather than
assuming the deliverable is instantly available, since the agent works in
the background with no push notification back to the buyer.

Caught two extraction mistakes while copying these event ABIs over, both
from the same root cause (grabbing text near a name match instead of the
whole enclosing object) and both caught by re-verifying with actual brace
matching instead of trusting the first pass: `JobSubmitted` was missing an
entire indexed `provider` field, and `JobInitialised` needed the same
check even though it turned out to already be correct. Worth the extra
verification step given wrong ABI field order silently decodes wrong data
rather than throwing.

**Independent cross-check (session 7):** the contract addresses in
`contracts.ts` were sourced from the demo repo in session 5. This session
found the actual `@bnbagent/sdk` package (nested under the CLI installed in
session 2) ships its own hardcoded registry — `dist/networks/index.cjs`,
`BNB_CHAIN_ADDRESSES[97]`. Read it at runtime and compared directly: every
address matches exactly (`commerceProxy`, `routerProxy`, `policy`,
`paymentToken`). Two independent sources agreeing is meaningfully stronger
evidence than one, and it confirmed something else worth knowing —
`commerceProxy`/`routerProxy` are genuinely the addresses to call (this is
an upgradeable-proxy pattern; `commerceImpl`/`routerImpl` are the
underlying implementations, not call targets), which is exactly what
`contracts.ts` already uses.

**OAuth2/Cognito — still genuinely open, now with more places ruled out.**
Checked the SDK's own `erc8183` and `storage` modules this session on the
chance either handled it. Neither does — `erc8183` authenticates purely by
wallet signature (on-chain calls, no HTTP auth layer), and the `storage`
module's bearer-auth code is generic upload-provider plumbing, unrelated.
Combined with `gateway.ts` being a dead end last session, that's three
places checked that all turned out to be adjacent-but-different concerns.
The actual answer is presumably in whatever `bag deploy --provider aws`
provisions on Cognito's side — not yet checked, since it requires an actual
deploy to inspect.

## What's still open

- **Not tested against a live chain** — no deployed agent to actually
  negotiate with yet (needs the steps in `agents/README.md` first), so this
  is verified-by-reading-real-source, not verified-by-running. `bag doctor`
  / a real `bag dev` agent is the natural next check once one exists.
- **`settle()`** (claiming payment after the dispute window) is
  deliberately operator-run CLI per the agent's own card, not wired into
  the buyer-facing UI — correctly out of scope here.
- **`gateway.ts` turned out to be a dead end for the OAuth2 question** —
  checked it while in the demo repo anyway, since it was already cloned.
  It's a *different* piece of infrastructure entirely: a local payload
  relay the buyer runs to hand large data (e.g. portfolio holdings) to the
  seller over a plain bearer token, unrelated to authenticating against a
  deployed agent's own A2A/Cognito endpoint. Worth knowing so nobody else
  goes looking there for the same answer — the OAuth2 TODO in
  `apps/api/src/routes/hire.ts` is still genuinely open.
