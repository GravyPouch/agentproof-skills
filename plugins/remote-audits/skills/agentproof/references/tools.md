# AgentProof MCP tools

Server: `https://isagentproof.com/mcp`. Each account belongs to one workspace, and every tool acts on it. No tool takes a `workspace_id`; a call that passes one fails.

Roles are `owner`, `admin` and `member`. A member can see runs and reports and start and plan runs. An admin can also invite and remove members and manage billing and workspace settings.

Every run tests the website saved in AgentProof Settings > Website, and only once its domain is verified (DNS TXT record) and the owner has confirmed there that they may test it. No tool takes a website. While the website is missing, unverified or unconfirmed, run tools fail with a message that says what to do in Settings: https://isagentproof.com/dashboard/settings/#settings-website

## Account and billing

| Tool | Arguments | Returns | Who can call it |
| --- | --- | --- | --- |
| `get_account` | none | Account ID, email, name, whether the email is verified, and the workspace with its ID, name and the user's role (or null) | Anyone signed in |
| `get_billing` | none | Subscription status, plan, renewal or end date, credits left this month and whether runs can start | Any member |

`get_billing` is read-only. It returns no prices and no payment links. Plans and payment are managed on https://isagentproof.com.

## Workspace and members

| Tool | Arguments | What it does | Who can call it |
| --- | --- | --- | --- |
| `create_workspace` | `name` (required) | Creates a workspace owned by the user | Accounts without a workspace |
| `rename_workspace` | `name` (required) | Replaces the workspace's name for every member | Owner |
| `list_members` | none | Members with user ID, email, name, role and join time; pending invitations for owners and admins | Any member |
| `invite_member` | `email` (required), `role` (`member` or `admin`, default `member`) | Emails an invitation that expires in 7 days | Admins invite members; only the owner invites admins |
| `revoke_invitation` | `invitation_id` (required, from `list_members`) | Cancels a pending invitation. Its link stops working; this cannot be undone | Owner, admin |
| `change_member_role` | `user_id` (required, from `list_members`), `role` (`member` or `admin`, required) | Changes a person's role at once | Owner |
| `remove_member` | `user_id` (required, from `list_members`) | Removes a person. Their past runs and reports stay with the workspace | Admins remove members; only the owner removes admins |
| `leave_workspace` | none | Removes the user from the workspace at once; they need a new invitation to return | Any member except the owner |

Ownership transfer and deletion are not tools. They happen on the website.

## Agents and runs

| Tool | Arguments | What it does | Credits |
| --- | --- | --- | --- |
| `list_agents` | none | The Attack Agent and the Defense Agent, with ID, team, whether each is running and its current run | 0 |
| `start_audit` | none | Starts an Attack Agent test of the website in Settings with AgentProof's built-in safety rules: no real orders, no data changes, no heavy traffic. If a confirmed finding matches a connected GitHub repository, a Defense Agent prepares a fix pull request and a retest follows | 1, plus 1 for the fix and 1 for the retest |
| `start_run` | `team` (`attack` or `defense`) or `agent_id` (from `list_agents`), `prompt` (required) | Starts a task on one agent with the given instructions, on the website in Settings | 1 |
| `get_run` | `run_id` (required) | Status, agent, website, start and end times, report state and the run page | 0 |
| `list_reports` | `agent_id` (optional), `limit` (1 to 50, default 20), `cursor` (`nextCursor` of the previous page) | Finished runs that have reports, newest first | 0 |
| `list_findings` | `run_id` (optional) | Findings with title, severity, status and address, plus the fix pull request state. Without `run_id`, the workspace's newest findings. Evidence stays on the run page | 0 |
| `list_planned_runs` | `limit` (1 to 100, default 50) | Planned runs in time order with team, copies, website, start time and a Calendar link; runs left to plan this month; whether Auto schedule every month is on | 0 |
| `set_monthly_auto_schedule` | `enabled` (required boolean) | Turns Auto schedule every month on or off. When on, AgentProof plans the rest of each credit month on the website in Settings | 1 per planned run when it starts |

Run status values seen while a run is not done: `queued`, `provisioning`, `running`. Any other status means the run has ended. Read the status text that `get_run` returns rather than assuming a fixed list.

## Notifications

| Tool | Arguments | What it does |
| --- | --- | --- |
| `list_notification_destinations` | none | The workspace's notification destinations (webhook, Slack or Discord) with the events each receives and its last delivery. Read-only |
| `send_test_notification` | `destination_id` (required, from `list_notification_destinations`) | Sends a test event to one enabled destination and returns the delivery record. Owners and admins only |

Destinations are created, changed and deleted on the website, in Settings. No tool adds a destination.

## Errors

- **Not signed in or token expired:** reconnect the server in the client's MCP settings.
- **Permission error:** the user's role does not allow the action. Tell the user which role is needed.
- **No website, or its domain not verified or confirmed:** the run did not start. Relay the message and the Settings link above.
- **No active plan or no credits left:** the run did not start. Tell the user that plans are managed on https://isagentproof.com.
