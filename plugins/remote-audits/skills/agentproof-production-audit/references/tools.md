# Tools used by the production audit

Server: `https://isagentproof.com/mcp`. Each tool takes an optional `workspace_id` from `get_account`; without it, the tool acts on the current workspace. The full list of AgentProof tools is in the `agentproof` skill.

| Tool | Arguments | Returns | Credits |
| --- | --- | --- | --- |
| `get_account` | none | Account, workspaces, the user's role and the current workspace | 0 |
| `get_billing` | `workspace_id` | Subscription status, plan name, renewal or end date, credits left this month. No prices and no payment links | 0 |
| `start_audit` | `target` (required), `confirm_permission` (required, `true` only when the user confirmed ownership or written permission), `workspace_id` | The new run, with its ID and page link | 1, plus 1 for a fix pull request and 1 for its retest |
| `get_run` | `run_id` (required), `workspace_id` | Status, agent, target, start and end times, report state, run page link | 0 |
| `list_findings` | `run_id` (optional), `workspace_id` | Title, severity, status and address of each finding, plus the fix pull request state | 0 |
| `list_reports` | `agent_id`, `limit` (1 to 50), `cursor`, `workspace_id` | Finished runs that have reports, newest first | 0 |
| `list_notification_destinations` | `workspace_id` | The workspace's notification destinations and the events each receives | 0 |

`start_audit` uses a prompt that AgentProof's server writes. You do not write the agent's instructions for an audit. It refuses targets that are not public websites, and it refuses to start without an active plan and a credit.

While a run is not done, `get_run` reports `queued`, `provisioning` or `running`. Any other status means it has ended.
