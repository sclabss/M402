# Health Factor Monitoring agent (placeholder)

Watches lending positions (Venus/Aave V3) and alerts or acts before
liquidation.

- Reads: health factor per monitored position.
- Action: a protective response (repay / add collateral) within a spend cap
  set on the agent's session.

Run `bag init` in this folder to replace this file with a real agent.
