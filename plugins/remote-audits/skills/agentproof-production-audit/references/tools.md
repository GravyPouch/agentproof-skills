# Tools used by the production audit

Server: `https://isagentproof.com/mcp`. Each account has one workspace and every tool acts on it; no tool takes a `workspace_id`. The full list of AgentProof tools is in the `agentproof` skill.

| Tool | Arguments | Returns | Credits |
| --- | --- | --- | --- |
| `get_account` | none | Account, its workspace and the user's role | 0 |
| `get_billing` | none | Subscription status, plan, renewal or end date, credits left this month. No prices and no payment links | 0 |
| `start_audit` | none | The new run, with its ID, website and page link | 1, plus 1 for a fix pull request and 1 for its retest |
| `get_run` | `run_id` (required) | Status, agent, website, start and end times, report state, run page link | 0 |
| `list_findings` | `run_id` (optional) | Title, severity, status and address of each finding, plus the fix pull request state | 0 |
| `list_reports` | `agent_id`, `limit` (1 to 50), `cursor` | Finished runs that have reports, newest first | 0 |
| `list_notification_destinations` | none | The workspace's notification destinations and the events each receives | 0 |

`start_audit` tests the website saved in AgentProof Settings > Website, with a prompt that AgentProof's server writes. You do not choose the website or write the agent's instructions. It refuses to start until that website's domain is verified and its ownership confirmed in Settings, and without an active plan and a credit.

While a run is not done, `get_run` reports `queued`, `provisioning` or `running`. Any other status means it has ended.
