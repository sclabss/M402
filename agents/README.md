# Agent workspaces

These four directories are where the seller agents live once scaffolded with
the BNB Agent Studio CLI. They're intentionally **outside** the `apps/` and
`packages/` pnpm workspace — Agent Studio's `bag init` produces its own
Python project per agent (its own `app/agent/`, `app/service/`, wallet
keystore, and deploy config), and the marketplace only ever talks to them
over HTTP (`POST /apex/negotiate`, and the A2A task endpoint once that's
wired up), never by importing their code. See `../ARCHITECTURE.md` for the
full reasoning.

## To generate a real agent here

```bash
npm install -g @bnbagent/studio-cli
cd agents/rebalancing        # or whichever category
bag init
bag skills install
# describe the agent's behavior to Cursor/Claude Code, then:
bag dev                      # local loop
bag deploy                   # ships Layer A to AgentCore, Layer B to EC2/Fargate
```

Each subfolder currently just holds a placeholder describing what that agent
needs to do. Replace it with the real `bag init` output as each one comes
online — **start grid_trading first**, since its TermiX track-record
criterion needs elapsed time, not just build time.
