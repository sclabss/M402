# Deploying M402

The brief's eligibility section is explicit: *"Your submission must be
functional and publicly accessible during judging."* This is what closes
that gap — deployment config for the marketplace itself (`apps/web` +
`apps/api`). Deploying the four *agents* is a separate, already-documented
concern — see `agents/README.md`.

## Honesty check on what's below

Everything in this repo up to this point — the TypeScript, the ABIs, the
API integrations — got typechecked, built, or live-tested before being
committed. **The deployment config below is different: it's written
against well-established, standard patterns, but this sandbox has no
Docker and no path to a Vercel account, so none of it has actually been
run.** Worth running `docker build` and a real Vercel deploy for real
before trusting either blindly, the same way everything else here got
checked before being trusted.

## apps/web → Vercel

1. Import the repo into Vercel.
2. **Set Root Directory to `apps/web`** in the project's dashboard
   settings. This can't be expressed in `vercel.json` — it's a dashboard-
   only setting, and skipping it is the most likely way this silently
   doesn't work.
3. `apps/web/vercel.json` handles the rest: it explicitly `cd`s to the
   repo root for install and build, so the workspace (`packages/shared-
   types`) resolves correctly rather than relying on Vercel's monorepo
   auto-detection to guess right.
4. Environment variables (Project Settings → Environment Variables):
   `NEXT_PUBLIC_API_URL` (the deployed apps/api URL, not localhost),
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_BSC_LOG_RPC_URL`.

## apps/api → any Docker host (Railway / Render / Fly.io all work)

`apps/api/Dockerfile` is a standard multi-stage pnpm-workspace build —
install only `@m402/api`'s deps, compile, ship a slim runtime image. Any of
the three platforms above auto-detect a Dockerfile with close to zero
extra config; pick whichever you'd rather have an account on.

Environment variables the container needs at runtime: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SCAN_8004_API_KEY` (optional — works
anonymously at a lower rate limit without it), `SCAN_8004_BASE_URL`
(defaults sensibly), `PORT` (defaults to 4000; most platforms inject their
own and expect you to read it, which `src/index.ts` already does).

One thing to tighten before judging, not before: `cors()` in
`src/index.ts` currently allows every origin. Fine for development: fine
for a hackathon demo, arguably — but worth restricting to the deployed
`apps/web` origin once that URL is known, rather than shipping wide open.

## CI

`.github/workflows/ci.yml` runs `pnpm typecheck` and `pnpm build` on every
push/PR — the same two checks this repo's own commit history shows running
by hand before every session's commit, now automatic. This one I'm
confident about even unvalidated here: it's plain GitHub Actions syntax
against scripts that already run correctly in this sandbox, just on a
runner with normal internet access (where `apps/web`'s build won't hit the
font-fetch limitation documented throughout the rest of this repo).

## Order that actually matters

Deploy `apps/api` first — you need its real URL for `apps/web`'s
`NEXT_PUBLIC_API_URL`. Both can go live before any agent is deployed (the
marketplace degrades honestly to empty/error states without one, per every
prior session's frontend work) — but judging needs the real loop, so don't
leave agent deployment for last.
