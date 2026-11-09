// Checks the skills, plugins and repository files. Node built-ins only.
// Run with: node --test "tests/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path), "utf8");
const readJSON = path => JSON.parse(read(path));

const SITE = "https://isagentproof.com";
const MCP_URL = "https://isagentproof.com/mcp";

const kinds = {
  remote: { plugin: "plugins/remote-audits", name: "agentproof-remote-audits", skills: ["agentproof", "agentproof-production-audit"] },
  local: {
    plugin: "plugins/local-audits",
    name: "agentproof-local-audits",
    skills: ["nextjs-security-audit", "postgres-security-audit", "supabase-security-audit"],
  },
};

// Every tool the AgentProof MCP server offers.
const MCP_TOOLS = [
  "get_account", "create_workspace", "rename_workspace", "list_members", "invite_member", "revoke_invitation",
  "change_member_role", "remove_member", "leave_workspace", "get_billing", "list_agents", "start_run", "get_run",
  "list_reports", "list_findings", "start_audit", "list_notification_destinations", "send_test_notification",
];
// Backticked names that look like tool calls. Anything matching must be a real tool.
const TOOL_LIKE = /^(get|list|start|create|rename|invite|revoke|change|remove|leave|send|delete|update|open|cancel|stop|set|add)_[a-z_]+$/;

const fixtures = {
  "nextjs-security-audit": "tests/fixtures/nextjs-app",
  "postgres-security-audit": "tests/fixtures/postgres-app",
  "supabase-security-audit": "tests/fixtures/supabase-app",
};

const allSkills = Object.entries(kinds).flatMap(([kind, k]) => k.skills.map(name => ({ kind, name, dir: `${k.plugin}/skills/${name}` })));

function walk(dir, skip = []) {
  return readdirSync(join(root, dir)).flatMap(name => {
    const path = dir ? `${dir}/${name}` : name;
    if (skip.includes(path) || name === ".git" || name === "node_modules") return [];
    return statSync(join(root, path)).isDirectory() ? walk(path, skip) : [path];
  });
}

const skillFiles = dir => walk(dir).filter(f => f.endsWith(".md"));

// Minimal YAML frontmatter parser for the keys the spec allows.
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, "SKILL.md starts with --- frontmatter ---");
  const data = {};
  let parent = null;
  for (const line of m[1].split("\n")) {
    if (!line.trim()) continue;
    const nested = line.match(/^ {2}([A-Za-z0-9_-]+):\s*(.*)$/);
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nested && parent) data[parent][nested[1]] = unquote(nested[2]);
    else if (top) {
      if (top[2] === "") { data[top[1]] = {}; parent = top[1]; }
      else { data[top[1]] = unquote(top[2]); parent = null; }
    } else assert.fail(`unexpected frontmatter line: ${line}`);
  }
  return { data, body: text.slice(m[0].length) };
}
const unquote = v => v.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

function sections(body) {
  const out = [];
  for (const part of body.split(/^(?=## )/m)) {
    const m = part.match(/^## (.+)$/m);
    if (m && part.startsWith("## ")) out.push({ title: m[1].trim(), text: part });
  }
  return out;
}

const prose = text => text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
const backticked = text => [...text.matchAll(/`([^`\n]+)`/g)].map(m => m[1]);
const cves = text => [...new Set(text.match(/CVE-\d{4}-\d{4,}/g) ?? [])];
const nvd = id => `https://nvd.nist.gov/vuln/detail/${id}`;

test("each skill sits under the right plugin, and no other skills exist", () => {
  for (const [kind, k] of Object.entries(kinds)) {
    const found = readdirSync(join(root, k.plugin, "skills")).filter(n => statSync(join(root, k.plugin, "skills", n)).isDirectory()).sort();
    assert.deepEqual(found, [...k.skills].sort(), `${kind} plugin skills`);
  }
  const skillMds = walk("", ["tests/fixtures"]).filter(f => f.endsWith("/SKILL.md"));
  assert.deepEqual(skillMds.sort(), allSkills.map(s => `${s.dir}/SKILL.md`).sort());
});

for (const skill of allSkills) {
  test(`${skill.name}: frontmatter uses only spec keys and the name matches the directory`, () => {
    const { data } = frontmatter(read(`${skill.dir}/SKILL.md`));
    assert.deepEqual(Object.keys(data).sort(), ["description", "license", "metadata", "name"]);
    assert.equal(data.name, skill.name);
    assert.match(data.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(data.name.length <= 64);
    assert.ok(data.description.length > 0 && data.description.length <= 1024, `description is ${data.description.length} characters`);
    assert.match(data.description, /Use when/, "description says when to use the skill");
    assert.equal(data.license, "MIT");
    assert.deepEqual(Object.keys(data.metadata).sort(), ["author", "version"]);
    assert.equal(data.metadata.author, "AgentProof");
    assert.match(data.metadata.version, /^\d+\.\d+\.\d+$/);
  });

  test(`${skill.name}: SKILL.md is under 500 lines and links ${SITE}`, () => {
    const text = read(`${skill.dir}/SKILL.md`);
    assert.ok(text.split("\n").length < 500);
    assert.ok(frontmatter(text).body.includes(SITE));
  });

  test(`${skill.name}: has an MIT LICENSE`, () => {
    assert.match(read(`${skill.dir}/LICENSE`), /^MIT License/);
  });

  test(`${skill.name}: relative links point to files that exist`, () => {
    for (const file of skillFiles(skill.dir)) {
      for (const [, target] of prose(read(file)).matchAll(/\]\(([^)#\s]+)\)/g)) {
        if (/^[a-z]+:/.test(target)) continue;
        assert.ok(existsSync(join(root, dirname(file), target)), `${file} links missing ${target}`);
      }
    }
  });

  test(`${skill.name}: never mentions checkout or prices`, () => {
    for (const file of walk(skill.dir)) {
      const text = read(file);
      assert.doesNotMatch(text, /checkout/i, file);
      assert.doesNotMatch(prose(text), /\$\s?\d/, `${file} contains a price`);
    }
  });
}

test("remote skills open with the account requirement and a link to the website", () => {
  for (const name of kinds.remote.skills) {
    const { body } = frontmatter(read(`${kinds.remote.plugin}/skills/${name}/SKILL.md`));
    const opening = body.split("\n").slice(0, 6).join("\n");
    assert.match(opening, /requires an AgentProof account/, name);
    assert.ok(opening.includes(SITE), name);
  }
});

test("remote skills name only MCP tools listed in their tool reference", () => {
  for (const name of kinds.remote.skills) {
    const dir = `${kinds.remote.plugin}/skills/${name}`;
    const reference = read(`${dir}/references/tools.md`);
    const listed = new Set([...reference.matchAll(/^\| `([a-z_]+)` \|/gm)].map(m => m[1]));
    assert.ok(listed.size > 0, `${name} has a tool reference`);
    for (const tool of listed) assert.ok(MCP_TOOLS.includes(tool), `${name} reference lists unknown tool ${tool}`);
    for (const file of skillFiles(dir)) {
      for (const token of backticked(read(file))) {
        if (MCP_TOOLS.includes(token) || TOOL_LIKE.test(token)) {
          assert.ok(listed.has(token), `${file} names ${token}, which is not in its tool reference`);
        }
      }
    }
  }
  const full = read(`${kinds.remote.plugin}/skills/agentproof/references/tools.md`);
  for (const tool of MCP_TOOLS) assert.ok(full.includes(`| \`${tool}\` |`), `agentproof reference lists ${tool}`);
});

test("remote skills never run their own requests or scans against the target", () => {
  for (const name of kinds.remote.skills) {
    for (const file of skillFiles(`${kinds.remote.plugin}/skills/${name}`)) {
      for (const [, block] of read(file).matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
        assert.doesNotMatch(block, /\b(curl|wget|nmap|sqlmap|nuclei|nikto|ffuf|httpx)\b|fetch\(/, `${file} has a request or scan command`);
      }
    }
  }
});

test("local skills start with safety rules and end with a Remote audit section", () => {
  for (const name of kinds.local.skills) {
    const { body } = frontmatter(read(`${kinds.local.plugin}/skills/${name}/SKILL.md`));
    const list = sections(body);
    assert.equal(list[0].title, "Safety rules", `${name} first section`);
    const last = list.at(-1);
    assert.equal(last.title, "Remote audit", `${name} last section`);
    assert.ok(last.text.includes("`agentproof-production-audit`"), `${name} names agentproof-production-audit`);
    assert.match(last.text, /require an AgentProof account/, `${name} states the account requirement`);
    assert.ok(last.text.includes(SITE), `${name} links ${SITE}`);
    assert.ok(last.text.split("\n").filter(Boolean).length <= 4, `${name} Remote audit section is short`);
  }
});

test("local skills mention no MCP tool outside their closing Remote audit section", () => {
  for (const name of kinds.local.skills) {
    const dir = `${kinds.local.plugin}/skills/${name}`;
    const { body } = frontmatter(read(`${dir}/SKILL.md`));
    const beforeRemote = body.slice(0, body.lastIndexOf("## Remote audit"));
    const texts = [beforeRemote, ...skillFiles(`${dir}/references`).map(read)];
    for (const text of texts) {
      for (const tool of MCP_TOOLS) assert.ok(!new RegExp(`\\b${tool}\\b`).test(text), `${name} mentions ${tool}`);
      assert.ok(!text.includes(MCP_URL), `${name} mentions the MCP server`);
    }
  }
});

test("local skills send requests only to local targets", () => {
  for (const name of kinds.local.skills) {
    for (const file of skillFiles(`${kinds.local.plugin}/skills/${name}`)) {
      for (const line of read(file).split("\n")) {
        if (!/^\s*(curl|wget)\s/.test(line)) continue;
        assert.match(line, /localhost|127\.0\.0\.1|\$API\b/, `${file}: ${line.trim()}`);
      }
    }
  }
});

test("every local skill has a CVE table with a research date, and every CVE row links NVD", () => {
  for (const name of kinds.local.skills) {
    const dir = `${kinds.local.plugin}/skills/${name}`;
    const table = read(`${dir}/references/cves.md`);
    assert.match(table, /^Research date: \d{4}-\d{2}-\d{2}\./m, `${name} states its research date`);
    const rows = table.split("\n").filter(l => l.startsWith("|") && /CVE-\d{4}-\d+/.test(l));
    assert.ok(rows.length > 0, `${name} has CVE rows`);
    for (const row of rows) {
      for (const id of cves(row)) assert.ok(row.includes(nvd(id)), `${name}: row for ${id} links ${nvd(id)}`);
    }
    for (const file of skillFiles(dir)) {
      for (const id of cves(read(file))) assert.ok(table.includes(nvd(id)), `${file} cites ${id}, which has no NVD link in cves.md`);
    }
  }
});

// The CVE sourcing rule: every CVE cited in a skill appears in AgentProof's research file.
// Runs when the research file is next to this repository, or at AGENTPROOF_RESEARCH_FILE.
test("every cited CVE appears in AgentProof's research file", t => {
  const parent = join(root, "..");
  const siblings = readdirSync(parent).map(name => join(parent, name, "docs/agentproof-blog-research.md"));
  const candidates = [process.env.AGENTPROOF_RESEARCH_FILE, ...siblings].filter(Boolean);
  const file = candidates.find(p => existsSync(p) && readFileSync(p, "utf8").includes("### PostgreSQL"));
  if (!file) return t.skip("research file with a PostgreSQL section not found");
  const research = readFileSync(file, "utf8");
  for (const name of kinds.local.skills) {
    for (const path of skillFiles(`${kinds.local.plugin}/skills/${name}`)) {
      for (const id of cves(read(path))) assert.ok(new RegExp(`\\b${id}\\b`).test(research), `${path} cites ${id}, which is not in ${relative(root, file)}`);
    }
  }
});

test("every AgentProof URL uses isagentproof.com over https", () => {
  for (const file of walk("", ["tests/fixtures"])) {
    if (!/\.(md|json|mjs|yml|txt)$/.test(file) && file !== "LICENSE") continue;
    for (const [match] of read(file).matchAll(/\bhttps?:\/\/[^\s)"'`<>\]|]+/g)) {
      const url = match.replace(/[.,;:]+$/, "");
      const { host, protocol } = new URL(url);
      if (/agentproof/i.test(host)) {
        assert.equal(host, "isagentproof.com", `${file}: ${url}`);
        assert.equal(protocol, "https:", `${file}: ${url}`);
      }
    }
  }
});

test("README names AgentProof, links the website first, and has the install commands and badge", () => {
  const readme = read("README.md");
  const first = readme.split("\n")[0];
  assert.match(first, /AgentProof/);
  assert.ok(first.includes(SITE));
  assert.ok(readme.includes("[![skills.sh](https://skills.sh/b/GravyPouch/agentproof-skills)](https://skills.sh/GravyPouch/agentproof-skills)"));
  assert.match(readme, /^## Remote audits$/m);
  assert.match(readme, /^## Local audits$/m);
  for (const skill of allSkills) assert.ok(readme.includes(`npx skills add GravyPouch/agentproof-skills --skill ${skill.name}`), skill.name);
  assert.ok(readme.includes("/plugin marketplace add GravyPouch/agentproof-skills"));
  assert.ok(readme.includes("/plugin install agentproof-remote-audits@agentproof-skills"));
  assert.ok(readme.includes("/plugin install agentproof-local-audits@agentproof-skills"));
  assert.doesNotMatch(readme, /checkout/i);
});

test("root LICENSE is MIT", () => {
  assert.match(read("LICENSE"), /^MIT License\n\nCopyright \(c\) \d{4} AgentProof/);
});

test("marketplace lists both plugins with their sources", () => {
  const m = readJSON(".claude-plugin/marketplace.json");
  assert.equal(m.name, "agentproof-skills");
  assert.equal(m.owner.name, "AgentProof");
  const plugins = Object.fromEntries(m.plugins.map(p => [p.name, p]));
  assert.deepEqual(Object.keys(plugins).sort(), ["agentproof-local-audits", "agentproof-remote-audits"]);
  for (const k of Object.values(kinds)) {
    assert.equal(plugins[k.name].source, `./${k.plugin}`);
    assert.equal(plugins[k.name].homepage, SITE);
  }
});

test("each plugin.json has the required metadata and links the website", () => {
  for (const k of Object.values(kinds)) {
    const p = readJSON(`${k.plugin}/.claude-plugin/plugin.json`);
    assert.equal(p.name, k.name);
    assert.equal(p.version, "1.0.0");
    assert.ok(p.description);
    assert.equal(p.author.name, "AgentProof");
    assert.equal(p.homepage, SITE);
    assert.equal(p.repository, "https://github.com/GravyPouch/agentproof-skills");
    assert.equal(p.license, "MIT");
    assert.ok(Array.isArray(p.keywords) && p.keywords.length > 0);
  }
});

test("only the remote plugin has the MCP server", () => {
  assert.deepEqual(readJSON(`${kinds.remote.plugin}/.mcp.json`), { mcpServers: { agentproof: { type: "http", url: MCP_URL } } });
  assert.ok(!existsSync(join(root, kinds.local.plugin, ".mcp.json")));
  assert.equal(readJSON(`${kinds.local.plugin}/.claude-plugin/plugin.json`).mcpServers, undefined);
});

// Schema: https://skills.sh/schemas/skills.sh.schema.json (checked by hand; no network in tests).
test("skills.sh.json matches the documented schema and groups the skills by kind", () => {
  const s = readJSON("skills.sh.json");
  const allowed = ["$schema", "schema", "notGrouped", "groupings", "paths"];
  for (const key of Object.keys(s)) assert.ok(allowed.includes(key), `unknown key ${key}`);
  assert.ok(s.groupings || s.paths);
  if (s.notGrouped !== undefined) assert.ok(["top", "bottom"].includes(s.notGrouped));
  assert.ok(Array.isArray(s.groupings) && s.groupings.length >= 1 && s.groupings.length <= 50);
  for (const g of s.groupings) {
    for (const key of Object.keys(g)) assert.ok(["title", "description", "skills"].includes(key), `unknown group key ${key}`);
    assert.ok(typeof g.title === "string" && g.title.length >= 1 && g.title.length <= 120);
    if (g.description !== undefined) assert.ok(typeof g.description === "string" && g.description.length <= 500);
    assert.ok(Array.isArray(g.skills) && g.skills.length >= 1 && g.skills.length <= 500);
    for (const name of g.skills) assert.ok(typeof name === "string" && name.length >= 1 && name.length <= 120);
  }
  const groups = Object.fromEntries(s.groupings.map(g => [g.title, g.skills]));
  assert.deepEqual(groups["Remote audits"], kinds.remote.skills);
  assert.deepEqual(groups["Local audits"], kinds.local.skills);
  assert.ok(Array.isArray(s.paths) && s.paths.length >= 1 && new Set(s.paths).size === s.paths.length);
  for (const path of s.paths) {
    assert.match(path, /^\.\/[^\\]+$/);
    assert.ok(statSync(join(root, path)).isDirectory(), `${path} exists`);
  }
  assert.deepEqual([...s.paths].sort(), Object.values(kinds).map(k => `./${k.plugin}/skills`).sort());
});

test("each local skill has a fixture, and fixtures hold no real-looking keys", () => {
  for (const [name, dir] of Object.entries(fixtures)) {
    assert.ok(existsSync(join(root, dir, "package.json")), `${name} fixture`);
  }
  for (const file of walk("tests/fixtures")) {
    const text = read(file);
    assert.doesNotMatch(text, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, `${file} has a JWT-like value`);
    assert.doesNotMatch(text, /\b(sk|rk)_(live|test)_[A-Za-z0-9]{10,}/, `${file} has a Stripe-like key`);
    assert.doesNotMatch(text, /\bsb_secret_[A-Za-z0-9]{10,}/, `${file} has a Supabase secret-like key`);
  }
});

test("the brand is written as one word", () => {
  const split = new RegExp(["agent", "proof"].join("[- ]"), "i");
  for (const file of walk("")) {
    for (const line of read(file).split("\n")) assert.doesNotMatch(line, split, `${file}: ${line.trim()}`);
  }
});

test("no file carries AI attribution lines", () => {
  const banned = new RegExp(["Co-" + "Authored-By", "Claude-" + "Session", "Generated with \\[?Claude " + "Code"].join("|"), "i");
  for (const file of walk("")) assert.doesNotMatch(read(file), banned, file);
});

test("CI runs the tests on push and pull request", () => {
  const ci = read(".github/workflows/test.yml");
  assert.match(ci, /^\s+push:/m);
  assert.match(ci, /^\s+pull_request:/m);
  assert.match(ci, /node --test "tests\/\*\.test\.mjs"/);
});
