# M402 — Audit: what's real, what's missing, where we were wrong

Written after re-reading the actual brief against the actual repo, not
against eight sessions of my own summaries of it.

## Bottom line

The infrastructure is real and unusually well-verified for a hackathon
project at this stage — typechecked and built every session, cross-checked
against live APIs and independent sources, corrections documented rather
than hidden. But **the agents don't do real DeFi work yet, nothing is
deployed, and two of the three hard eligibility requirements aren't met.**
This is a strong foundation. It is not a submittable entry yet. Those are
different statements and this session's job is to not blur them.

## The biggest gap, and it hasn't come up clearly in eight sessions

Just checked `agents/gridtrading/app/agent/src/sellerCore.ts` directly.
The function that actually produces a deliverable —`doWorkAndSubmit`— is
completely generic:

```
const prompt = "You accepted and were paid for the following job. Produce
the deliverable now..." + JOB_CONTEXT
const work = await this.runWork(prompt, ...)
```

It takes whatever task description the buyer sent, hands it to an LLM, and
asks for text back. There is no grid-trading strategy in it. No order
placement. No PancakeSwap calls. And this isn't a shortcut I took — it's
by the Agent Studio scaffold's own design: `tools.ts`'s own comments state
plainly that every tool available to the LLM is **read-only**, and the
*only* things the fixed signing code can ever sign are the ERC-8183
protocol mechanics themselves (quote, submit, settle) — never an arbitrary
DeFi transaction. Same is true for all four agents; they're identically
scaffolded.

**What this means concretely:** as things stand, "hiring" the grid trading
agent would get you an LLM-generated description of a grid trading plan,
not an agent that places real orders. None of the four agents deliver real
liquidity management, real yield comparison, or real liquidation defense
yet. The READMEs I wrote say "bring in `pancakeSwap`/`pancakeAddLiquidity`
from bsc-mcp here" — that's a pointer to the work, not the work. I flagged
priority and sequencing extensively across eight sessions and never once
flagged that this specific piece — the part that makes any of it real —
was still completely unwritten. That should have been said explicitly a
long time ago.

This single gap is most of the answer to "are we aligned with the
tracks": Functionality, Data Quality, Agent Diversity, PancakeSwap's "real
benefit," and TermiX's "Value of the services" / "Proven agent advantage"
all assume the agents actually *do* something. Right now they don't.

> **Update, session 10:** fixed for `gridtrading`. **Update, session 11:**
> also fixed for `rebalancing`, reusing most of `gridtrading`'s verified
> PancakeSwap infrastructure rather than re-deriving it. `yieldoptimization`
> and `healthfactor` still have the gap described below exactly as
> written — and unlike `rebalancing`, they need genuinely new protocol
> research (Venus, Aave V3), not reuse of what's already verified. Two of
> four real now; don't read the rest of this section as resolved.

## Where we were actually wrong (not "unverified" — wrong, and caught)

Three specific instances, in the order they happened:

1. **Session 2 — the architecture itself.** Built the first `ARCHITECTURE.md`
   around a "Layer A / Layer B" two-service split, sourced from
   `docs.bnbchain.org`'s architecture page. Ran the real `bag init` in that
   same session and read what it actually generates: one unified process,
   not two services. The docs page wasn't fabricated — it's a real page —
   but what it described didn't match what the shipped CLI produces, and
   I'd written a full architecture doc around it before checking. Caught
   and corrected in the same session, but worth being honest that the
   first version was wrong, not just "later refined."

2. **Session 6 — a silently-wrong ABI.** Porting the `JobSubmitted` event
   definition, a first-pass extraction (grep near the name match) dropped
   an entire indexed `provider` field without erroring. A wrong event ABI
   doesn't crash — it just decodes the wrong data. Caught by deliberately
   re-verifying with real brace-matching before committing, not by any
   tool catching it automatically.

3. **Session 8 — an unverified assumption in a comment.** Wrote a CI
   workflow assuming apps/api's build needed dummy Supabase env vars to
   avoid a runtime throw. Actually tested it with zero env vars set before
   committing; the assumption was wrong (`tsc` never executes that code
   path). Fixed before shipping, but it's a real example of asserting
   something as fact that turned out to be false on the first check.

**What's still unverified, not because it's wrong but because it's never
been checked:**
- The Dockerfile and Vercel config — pattern-based, never actually run
  (no Docker in this sandbox, no path to deploy). Flagged clearly in
  `DEPLOYMENT.md` at the time, repeating here since it's directly relevant
  to "are we aligned with eligibility."
- Whether `bag dev` or `bag deploy` actually succeed — never run, since
  both need things I don't have (a funded wallet, AWS credentials).
- **The entire frontend, visually.** Every session validated with
  `tsc --noEmit` and `next build` — compiles cleanly, types check. Neither
  of those is "looks right in a browser." The ledger animation, the
  color/type choices, whether the wallet-connect flow actually produces a
  sane MetaMask popup — none of that has been visually confirmed. This is
  a real gap between "the code is correct" and "the product works," and
  eight sessions of clean typechecks shouldn't be mistaken for the latter.
- `CATEGORY_DEFAULT_TERMS` (the default task/deliverables/quality text per
  category) — these are defaults I wrote myself, not sourced from
  anywhere. Reasonable starting points, not verified requirements.

**What was NOT hallucinated, checked specifically because it's the kind of
thing that would matter most if faked:** the Agent Advantage Report has
zero seeded or fabricated task data. Just grepped `seed.sql` and every
route that touches `advantage_report_tasks` to confirm. The report is
correctly empty because nothing real has happened yet — not padded to
look further along than it is.

## Track-by-track, against the actual rubric text

**Main Track**
| Criterion | Status |
|---|---|
| Functionality | Partial. The flow exists — browse → detail → connect → quote → fund → notify → poll — and is real code, but has never completed against a live agent. Right now it mostly demonstrates graceful "not live yet" states, not the actual journey. |
| Data Quality | Partial. The data *model* supports it well, and 8004scan integration is real and live-tested. But there's no real position/performance data because nothing is deployed. |
| Agent Diversity | All four are equally scaffolded, which is good — but also equally missing real logic, which means "equal depth" is currently "equally shallow." Not one category neglected in favor of others; all four need the same next layer. |

**TermiX** — scores independently, and none of its four criteria are met yet:
- Value of the services (30%) — not met, no real agents doing real work
- Proven agent advantage (30%) — infrastructure real, data empty (correctly, not padded)
- High-stakes track record (20%) — not met, and this is the time-sensitive one flagged since session 1 that still hasn't started, because it can't start before deployment
- Marketplace quality (20%) — partial, real UI code, never visually verified, can't complete a real hire yet

**PancakeSwap Challenge** — not met yet. No agent executes a real PancakeSwap action. This is the same root cause as the biggest gap above, not a separate problem.

## Eligibility — the hard gates, not scored criteria

> "Your submission must be functional and publicly accessible during judging."
> "Agents surfaced on your marketplace must be live on BSC."

Neither is met right now. Session 8 wrote deployment *config*; nothing is
actually deployed. Zero agents are live on BSC. These aren't scored
criteria to optimize — if unmet at judging time, the submission may not be
eligible at all regardless of everything else here. This should be the
top of whatever comes next, not deep in a backlog.

## Resource usage — what we actually used vs. what's in the brief

| Resource | Used? |
|---|---|
| BNB Agent Studio (CLI, docs) | Yes, extensively — installed, ran for real, read generated source |
| 8004scan (API, docs) | Yes — real OpenAPI spec fetched, live-tested, discrepancies caught |
| TermiX (site, bsc-mcp) | Site read once (session 1). **bsc-mcp is referenced in every agent README but never actually integrated into `tools.ts`** — same root cause as the biggest gap |
| PancakeSwap dev docs | **Never fetched.** Everything PancakeSwap-related leaned on bsc-mcp's wrapper + general knowledge of V3 concentrated liquidity, not `developer.pancakeswap.finance` directly. Worth doing before writing the actual rebalancing logic, now that PancakeSwap is an active target |
| Altana (docs, SDK) | Correctly unused — you explicitly excluded this track early on |
| BSC Testnet Faucet | Referenced, never used (needs your wallet) |
| 8004scan Pro-Tier form | Documented, never submitted — needs your own details, can't be done on your behalf |

## What's genuinely solid, to be fair about it

Not everything above is a gap. The parts that got built are unusually
well-checked for this stage: the ERC-8183 integration is verified against
two independent sources (a demo repo and the SDK's own registry), the
8004scan client was live-tested and corrected against real API behavior
rather than trusted from docs, the whole TypeScript surface has typechecked
clean for eight sessions straight, and corrections got documented in place
rather than quietly overwritten. That discipline is real and worth keeping
for whatever comes next — it's just been applied to infrastructure that
doesn't yet do the thing the hackathon is actually judging.

## What actually needs to happen, in order

1. **Write real strategy logic into at least one agent's tools/work loop**
   — start with `gridtrading`, wiring in bsc-mcp's `pancakeSwap` and
   writing an actual grid strategy, not just a README pointer to it.
2. **Deploy that one agent for real** — `bag wallet new` → `bag llm
   activate` (needs your SIWE login) → `bag deploy` (needs your AWS
   credentials). Both are steps only you can do.
3. **Deploy the marketplace itself** (`apps/web` + `apps/api`) using
   session 8's config, for real this time — closes the "publicly
   accessible" gate.
4. **Let the trading agent accumulate a real track record** while the
   other three categories get the same real-logic treatment as step 1.
5. **Run real Advantage Report tasks** once something real exists to
   measure — at least 3, at least one high-stakes.
6. Everything else on the open list (OAuth2, Figma, broader 8004scan
   integration) is real but genuinely lower priority than the five above.
