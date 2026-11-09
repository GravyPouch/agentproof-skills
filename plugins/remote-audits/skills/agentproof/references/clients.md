# Connect AgentProof to each client

All clients use the same server:

- URL: `https://isagentproof.com/mcp`
- Transport: Streamable HTTP
- Authentication: OAuth 2.1. The client opens a browser window. The user signs in to AgentProof, or creates an account, and approves the connection.

The same steps are at https://isagentproof.com/docs/install-mcp-server/.

There is no API key to paste. If a client asks for a header or token, leave it empty and use its OAuth sign-in instead.

## Claude Code

```sh
claude mcp add --transport http agentproof https://isagentproof.com/mcp
```

Then start Claude Code, run `/mcp`, choose `agentproof` and sign in.

To add it for one project only, run the command inside the project with `--scope project`. This writes `.mcp.json` in the project. To add it for every project, use `--scope user`.

With the plugin instead:

```text
/plugin marketplace add GravyPouch/agentproof-skills
/plugin install agentproof-remote-audits@agentproof-skills
```

The plugin adds the same server and both remote audit skills.

## Claude.ai and Claude Desktop

1. Open Settings > Connectors.
2. Choose Add custom connector.
3. Name it `AgentProof` and paste `https://isagentproof.com/mcp`.
4. Choose Connect and sign in to AgentProof in the browser window.
5. Turn the connector on in the chat where you want to use it.

## ChatGPT

Add a custom MCP server (connector) with the URL `https://isagentproof.com/mcp`, choose OAuth when asked for authentication, and sign in to AgentProof. Custom connectors may need developer mode or a workspace admin's approval, depending on the ChatGPT plan.

## Cursor

Add a remote server in Cursor's MCP settings, or in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agentproof": {
      "url": "https://isagentproof.com/mcp"
    }
  }
}
```

Cursor shows a sign-in prompt for the server. Complete it in the browser.

## Codex

Add a remote HTTP MCP server named `agentproof` with the URL `https://isagentproof.com/mcp` in Codex's MCP settings or its configuration file, then sign in when Codex asks. Check the Codex documentation for the exact command or configuration key in your version.

## VS Code

Run the command "MCP: Add Server", choose HTTP, and paste `https://isagentproof.com/mcp`. Or add it to `.vscode/mcp.json`:

```json
{
  "servers": {
    "agentproof": {
      "type": "http",
      "url": "https://isagentproof.com/mcp"
    }
  }
}
```

Start the server from the MCP view and sign in when asked.

## Check the connection

Ask the assistant to call `get_account`. It returns the account email and workspaces when the connection works.

## Common problems

- **No browser window opened:** start the sign-in from the client's MCP or connector settings.
- **Authentication expired:** disconnect and connect again from the client. The user can also revoke a connection on the AgentProof website, in Settings > Security, and connect again.
- **Tools are missing:** the client may cache the tool list. Reconnect the server or restart the client.
- **Wrong workspace:** call `get_account` and pass the right `workspace_id`.
