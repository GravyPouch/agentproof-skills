Agent skills from [AgentProof](https://isagentproof.com), whose AI agents test websites and web apps for security problems.

# AgentProof skills

[![skills.sh](https://skills.sh/b/GravyPouch/agentproof-skills)](https://skills.sh/GravyPouch/agentproof-skills)

This repository has two kinds of skills. Remote audits use AgentProof's agents, through the AgentProof MCP server, to test a live site. Local audits run in your own coding agent, against your code and a local or staging environment.

The skills follow the Agent Skills format and work in Claude Code, Codex, Cursor and other agents that read `SKILL.md` files.

## Remote audits

Remote audits require an AgentProof account: https://isagentproof.com.

| Skill | What it does |
| --- | --- |
| [`agentproof`](plugins/remote-audits/skills/agentproof/SKILL.md) | Connects the AgentProof MCP server (`https://isagentproof.com/mcp`) and uses its tools: account, credits, members, runs, reports and findings. |
| [`agentproof-production-audit`](plugins/remote-audits/skills/agentproof-production-audit/SKILL.md) | Starts an audit of a live website you own or may test, follows the run, and summarizes the findings and fix pull requests. |

The MCP server signs you in through the browser with OAuth. There are no API keys. Setup for each client is at https://isagentproof.com/docs/install-mcp-server/. To add it to Claude Code without the plugin:

```sh
claude mcp add --transport http agentproof https://isagentproof.com/mcp
```

## Local audits

Local audits need no account. Each one checks the installed version against a CVE table, runs checks for its technology, writes a failing test for each real issue, applies the smallest fix, reruns the test, and records each finding in `security-findings/`.

| Skill | What it checks |
| --- | --- |
| [`nextjs-security-audit`](plugins/local-audits/skills/nextjs-security-audit/SKILL.md) | Auth in route handlers and Server Actions (not only middleware), Server Action input, `NEXT_PUBLIC_` secrets, Server to Client data, `next.config` headers and images, open redirects, draft mode and revalidation. |
| [`postgres-security-audit`](plugins/local-audits/skills/postgres-security-audit/SKILL.md) | App role and grants, row-level security, `SECURITY DEFINER` functions and `search_path`, extensions, `pg_hba` and SSL, SQL injection in app code, exposed connection strings. |
| [`supabase-security-audit`](plugins/local-audits/skills/supabase-security-audit/SKILL.md) | RLS on exposed tables, policies and `auth.uid()`, `service_role` keys in client code, storage policies, Edge Function JWT checks, anon reach, RPC functions. |

## Install

Install steps are also at https://isagentproof.com/docs/install-skills/.

With the `skills` CLI, one skill at a time:

```sh
npx skills add GravyPouch/agentproof-skills --skill agentproof
npx skills add GravyPouch/agentproof-skills --skill agentproof-production-audit
npx skills add GravyPouch/agentproof-skills --skill nextjs-security-audit
npx skills add GravyPouch/agentproof-skills --skill postgres-security-audit
npx skills add GravyPouch/agentproof-skills --skill supabase-security-audit
```

List every skill in the repository:

```sh
npx skills add GravyPouch/agentproof-skills --list
```

As Claude Code plugins:

```text
/plugin marketplace add GravyPouch/agentproof-skills
/plugin install agentproof-remote-audits@agentproof-skills
/plugin install agentproof-local-audits@agentproof-skills
```

`agentproof-remote-audits` adds both remote skills and the AgentProof MCP server. `agentproof-local-audits` adds the three local skills and no MCP server.

## Test

```sh
node --test "tests/*.test.mjs"
```

The tests check skill frontmatter, links, CVE tables and the rules for each kind of skill. `tests/fixtures/` holds one small, deliberately vulnerable project per local skill, for evaluating the skills. Do not deploy the fixtures.

## License

MIT. See [LICENSE](LICENSE).
