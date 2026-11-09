# AgentProof MCP tools

Server: `https://isagentproof.com/mcp`. Every tool except `get_account` and `create_workspace` takes an optional `workspace_id` from `get_account`. Without it, the tool acts on the current workspace.

Roles are `owner`, `admin` and `member`. Each person can own one workspace.

## Account and billing

| Tool | Arguments | Returns | Who can call it |
| --- | --- | --- | --- |
| `get_account` | none | Account ID, email, name, whether the email is verified, and every workspace with its ID, name, the user's role and whether it is current | Anyone signed in |
| `get_billing` | `workspace_id` | Subscription status, plan name, renewal or end date, credits left this month | Any member |

`get_billing` is read-only. It returns no prices and no payment links. Plans and payment are managed on https://isagentproof.com.

## Workspaces and members

| Tool | Arguments | What it does | Who can call it |
| --- | --- | --- | --- |
| `create_workspace` | `name` (1 to 60 characters, required) | Creates a workspace owned by the user and makes it current | Anyone who does not already own a workspace |
| `rename_workspace` | `workspace_id`, `name` (required) | Renames the workspace | Owner |
| `list_members` | `workspace_id` | Members and roles; pending invitations for owners and admins | Any member |
| `invite_member` | `workspace_id`, `email` (required), `role` (`member` or `admin`, default `member`) | Emails an invitation that expires in 7 days | Admins invite members; only the owner invites admins |
| `revoke_invitation` | `workspace_id`, `invitation_id` (required, from `list_members`) | Cancels a pending invitation | Owner, admin |
| `change_member_role` | `workspace_id`, `user_id` (required, from `list_members`), `role` (`member` or `admin`, required) | Changes a member's role | Owner |
| `remove_member` | `workspace_id`, `user_id` (required) | Removes a person. Their past runs and reports stay with the workspace | Admins remove members; only the owner removes admins |
| `leave_workspace` | `workspace_id` (required) | Removes the user from a workspace they do not own | Any member except the owner |

Ownership transfer and deletion are not tools. They happen on the website.

## Agents and runs

| Tool | Arguments | What it does | Credits |
| --- | --- | --- | --- |
| `list_agents` | `workspace_id` | Lists agents with ID, name, team (Attack or Defense) and whether each is running | 0 |
| `start_run` | `workspace_id`, `agent_id` (required, from `list_agents`), `prompt` (required, up to 20,000 characters), `target` (optional website address) | Starts a task on one agent with the given instructions | 1 |
| `start_audit` | `workspace_id`, `target` (required, such as `https://example.com`), `confirm_permission` (required boolean) | Starts an Attack Agent test of a live website with AgentProof's built-in safety rules: no real orders, no data changes, no heavy traffic. If a confirmed finding matches a connected GitHub repository, a Defense Agent prepares a fix pull request and a retest follows | 1, plus 1 for the fix and 1 for the retest |
| `get_run` | `workspace_id`, `run_id` (required) | Returns status, agent, target, start and end times, report state, and the run page on the AgentProof website | 0 |
| `list_reports` | `workspace_id`, `agent_id` (optional), `limit` (1 to 50, default 20), `cursor` (from the previous page) | Lists finished runs that have reports, newest first | 0 |
| `list_findings` | `workspace_id`, `run_id` (optional) | Lists findings with title, severity, status and address, plus the fix pull request state. Without `run_id`, returns the workspace's newest findings. Evidence stays on the run page | 0 |

`confirm_permission` must be `true`, and only when the user has said that they own the website or have written permission to test it. Never set it on the user's behalf.

Run status values seen while a run is not done: `queued`, `provisioning`, `running`. Any other status means the run has ended. Read the status text that `get_run` returns rather than assuming a fixed list.

## Notifications

| Tool | Arguments | What it does |
| --- | --- | --- |
| `list_notification_destinations` | `workspace_id` | Lists the workspace's notification destinations (webhook, Slack or Discord), the events each receives, and its last delivery. Read-only |
| `send_test_notification` | `destination_id` (from `list_notification_destinations`), `workspace_id` | Sends a test event to one destination and returns whether it was delivered. Owners and admins only |

Destinations are created, changed and deleted on the website, in Settings. No tool adds a destination.

## Errors

- **Not signed in or token expired:** reconnect the server in the client's MCP settings.
- **Permission error:** the user's role does not allow the action. Tell the user which role is needed.
- **No active plan or no credits left:** the run did not start. Tell the user that plans are managed on https://isagentproof.com.
