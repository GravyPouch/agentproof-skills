# Next.js security test templates

Adapt these to the project. Use its test runner if it has one; the templates use Vitest syntax, which Jest also accepts with small changes. Without a runner, use `node:test` and run TypeScript with `node --test --experimental-strip-types` on Node 22.6 or later, or with `npx tsx --test`.

Name each test after the finding ID so the regression is easy to find later.

## Mock the session

Most apps read the session through one helper. Mock that module so each test can act as anonymous, user A or user B.

```ts
// tests/security/session-mock.ts
import { vi } from "vitest";

export const users = {
  anonymous: null,
  userA: { userId: "user-a", role: "user" },
  userB: { userId: "user-b", role: "user" },
  admin: { userId: "admin-1", role: "admin" },
} as const;

let current: (typeof users)[keyof typeof users] = null;
export function actAs(user: keyof typeof users) { current = users[user]; }

// Point this at the app's real helper, for example "@/lib/session" or "@/auth".
vi.mock("@/lib/session", () => ({ getSession: async () => current }));
```

Also mock `next/headers` (`cookies`, `headers`) and `next/navigation` (`redirect`, `notFound`) when the code under test calls them outside a request.

## Route handler: anonymous, user A, user B

```ts
// tests/security/NEXT-001-admin-users-route.test.ts
import { describe, it, expect } from "vitest";
import { actAs } from "./session-mock";
import { GET } from "@/app/api/admin/users/route";

describe("NEXT-001 admin users route checks the session itself", () => {
  it("refuses an anonymous caller", async () => {
    actAs("anonymous");
    const res = await GET(new Request("http://localhost/api/admin/users"));
    expect([401, 403]).toContain(res.status);
  });

  it("refuses a signed-in user who is not an admin", async () => {
    actAs("userB");
    const res = await GET(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(403);
  });

  it("allows an admin", async () => {
    actAs("admin");
    const res = await GET(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(200);
  });
});
```

For dynamic routes, pass the params as the second argument. In Next.js 15 and later, `params` is a Promise: `GET(req, { params: Promise.resolve({ id: "1043" }) })`.

## Server Action: owner check

```ts
// tests/security/NEXT-002-delete-project-action.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { actAs } from "./session-mock";
import { deleteProject } from "@/app/actions";
import { db, resetDb } from "@/lib/db"; // use the app's test database or in-memory store

describe("NEXT-002 deleteProject checks the caller owns the project", () => {
  beforeEach(() => resetDb());

  it("refuses an anonymous caller and deletes nothing", async () => {
    actAs("anonymous");
    await expect(deleteProject("project-of-a")).rejects.toThrow();
    expect(await db.projects.find("project-of-a")).toBeTruthy();
  });

  it("refuses user B deleting user A's project", async () => {
    actAs("userB");
    await expect(deleteProject("project-of-a")).rejects.toThrow();
    expect(await db.projects.find("project-of-a")).toBeTruthy();
  });

  it("lets user A delete their own project", async () => {
    actAs("userA");
    await deleteProject("project-of-a");
    expect(await db.projects.find("project-of-a")).toBeFalsy();
  });
});
```

If the action returns an error object instead of throwing, assert on that object. Always assert that the data did not change, not only that an error came back.

## Middleware bypass reproduction (local only)

Only when the installed version is in the CVE-2025-29927 range, and only against `next dev` or `next start` on localhost:

```sh
npm run build && npm run start   # or: npm run dev
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/users
```

Record the status code without a session. After the fix, the route handler itself must return 401 or 403 even if middleware did not run. The route test above proves that without a server. Upgrading Next.js fixes the bypass itself.

## Bundle test: no server secrets in client chunks

Run after `next build`. It reads the env files, then searches every file in `.next/static` for each server-only value.

```js
// tests/security/client-bundle.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const envFiles = [".env", ".env.local", ".env.production", ".env.production.local"];
const secretName = /(SECRET|PRIVATE|TOKEN|PASSWORD|SERVICE_ROLE|DATABASE_URL|ADMIN)/;

function readEnv() {
  const vars = {};
  for (const file of envFiles) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m) vars[m[1]] = m[2];
    }
  }
  return vars;
}

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("NEXT-003 client chunks contain no server-only values", () => {
  assert.ok(existsSync(".next/static"), "run next build first");
  const vars = readEnv();
  const chunks = files(".next/static").filter(f => f.endsWith(".js")).map(f => [f, readFileSync(f, "utf8")]);
  const leaks = [];
  for (const [name, value] of Object.entries(vars)) {
    if (value.length < 8) continue;
    const isPublic = name.startsWith("NEXT_PUBLIC_");
    if (isPublic && !secretName.test(name)) continue;
    for (const [file, text] of chunks) {
      if (text.includes(value)) leaks.push(`${name} (${value.slice(0, 4)}…) in ${file}`);
    }
  }
  assert.deepEqual(leaks, []);
});

test("NEXT-003 no NEXT_PUBLIC_ variable is named like a secret", () => {
  const names = Object.keys(readEnv()).filter(n => n.startsWith("NEXT_PUBLIC_") && secretName.test(n));
  assert.deepEqual(names, []);
});
```

The test prints only the first 4 characters of a leaked value.

## Open redirect

```ts
import { GET } from "@/app/auth/callback/route";
it("redirects only to same-site paths", async () => {
  const res = await GET(new Request("http://localhost/auth/callback?next=https://evil.example"));
  const location = res.headers.get("location") ?? "";
  expect(new URL(location, "http://localhost").origin).toBe("http://localhost");
});
```
