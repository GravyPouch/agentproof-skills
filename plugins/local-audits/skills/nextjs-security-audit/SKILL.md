---
name: nextjs-security-audit
description: Audits a Next.js app's source code for security problems and proves each one with a test. Checks the installed Next.js version against known CVEs, authorization in route handlers and Server Actions (not only in middleware.ts or proxy.ts), Server Action input validation, secrets in NEXT_PUBLIC_ variables and client bundles, data passed from Server to Client Components, next.config headers and image remotePatterns, open redirects, and draft-mode and revalidation endpoints. Writes a failing test for each issue, applies the smallest fix, reruns the test, and records each finding in security-findings/. Use when the user asks for a security review, audit or pentest of a Next.js codebase, or asks whether their Next.js auth, Server Actions or environment variables are safe. Runs locally against code and a local or staging server only.
license: MIT
metadata:
  author: AgentProof
  version: "1.0.0"
---

# Next.js security audit

This skill audits a Next.js codebase and proves each issue with a test. It works on the code and on a local or staging server. It does not test production.

## Safety rules

Follow these before every step.

1. Audit only code and systems the user owns or has written permission to test.
2. Work on the code and on a local server (`next dev` or `next start` on localhost) by default. Before you send any request to a staging server, name the exact URL and get the user's yes. Never send requests to production.
3. No denial-of-service tests, destructive requests, mass scanning or data exfiltration. One request per check is enough.
4. Do not change data in a shared database. Use local test data, or ask first.
5. Redact secrets everywhere you write: in chat, tests and findings files. Write only the first 4 characters and where the value is, for example `sk_l… in .env.local:3`.

## Method

Every audit follows these five steps. Do not skip step 3: a finding without a test is a guess.

1. **Version.** Find the installed Next.js and React versions and check them against [references/cves.md](references/cves.md).
2. **Checks.** Run each check below. Commands and patterns for each are in [references/checks.md](references/checks.md).
3. **Prove.** Write a failing test or a local reproduction for each real issue. Label each issue:
   - **Proven:** a test or reproduction ran and showed the problem, or the evidence needs no runtime (for example, a secret value committed in a `NEXT_PUBLIC_` variable).
   - **Likely:** the code shows the problem, but the test could not run here. Say what is missing (installed dependencies, a running server, a database).
   - **Ruled out:** you checked it and it is safe. Say why in one sentence.
4. **Fix.** Apply the smallest change that fixes the issue. Keep the test as a regression test. Run it again. It must pass now.
5. **Record.** Write one file per finding in `security-findings/` using [references/record.md](references/record.md), and update `security-findings/index.md`.

## Step 1: Version

Find the package manager from the lockfile: `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (yarn) or `bun.lock` (bun). Then read the installed versions:

```sh
npm ls next react react-dom          # npm
pnpm why next react                  # pnpm
yarn why next                        # yarn
node -p "require('next/package.json').version"   # if node_modules exists
```

If there is no lockfile and no `node_modules`, read the range in `package.json` and say that the installed version is unknown. Compare the version with the CVE table. Report every row that applies, with its NVD link. A version below the safe floor in the table is a finding.

## Step 2: Checks

Map the app first. List:

- `middleware.ts` or `proxy.ts` (Next.js 16 renamed middleware to proxy) and its `matcher`;
- every route handler (`app/**/route.ts`, `pages/api/**`);
- every Server Action (`'use server'` files and inline `'use server'` functions);
- every page or layout that reads user data;
- the auth library and the function that returns the current user or session.

Then run each check. Details are in [references/checks.md](references/checks.md).

| # | Check | What is wrong |
| --- | --- | --- |
| 1 | Auth only in middleware | A route handler, Server Action or page reads or changes data without checking the session itself, and relies on `middleware.ts` or `proxy.ts`. Middleware can be skipped ([CVE-2025-29927](https://nvd.nist.gov/vuln/detail/CVE-2025-29927)) and matchers miss paths. |
| 2 | Server Action authorization | An exported Server Action does not check who is calling, or does not check that the caller owns the record it changes. Every exported action is a public POST endpoint. |
| 3 | Server Action input | An action trusts its arguments: no schema validation, IDs or roles taken from the client, unbounded strings or arrays. |
| 4 | `NEXT_PUBLIC_` secrets | A secret (API secret, service key, token, password, database URL) is in a `NEXT_PUBLIC_` variable, or a server-only value is read in a Client Component and gets inlined into the bundle. |
| 5 | Server to Client data | A Server Component passes whole records (password hashes, tokens, other users' data, internal flags) as props to a `'use client'` component. Modules holding secrets lack `import 'server-only'`. |
| 6 | `next.config` | Missing security headers (CSP, `frame-ancestors` or `X-Frame-Options`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`). `images.remotePatterns` with `hostname: '**'` or broad wildcards, or `dangerouslyAllowSVG` without a CSP. `serverActions.allowedOrigins` widened. |
| 7 | Open redirects | `redirect()`, `NextResponse.redirect()` or `router.push()` with a URL from the query string, form data or headers, without allowing only same-site paths. |
| 8 | Draft mode and revalidation | Routes that call `draftMode().enable()`, `revalidatePath()` or `revalidateTag()` without checking a secret, or with a secret that is public or compared unsafely. |
| 9 | Route handler CSRF | Route Handlers and Pages API routes have no built-in CSRF protection. A cookie-authenticated `POST`, `PUT`, `PATCH` or `DELETE` handler needs an `Origin` check, `SameSite` cookies or a token. |

Also note anything else you find in the code paths you read, such as SQL built from strings or missing rate limits on sign-in. Label it the same way.

## Step 3: Prove

Write the tests in the project's existing test setup (Vitest, Jest, Playwright or `node:test`). If there is none, use `node:test` in `tests/security/`. Templates are in [references/tests.md](references/tests.md).

- **Route and Server Action tests.** Call each protected route handler and Server Action three times: as an anonymous user, as user A, and as user B acting on user A's record. Assert that anonymous gets 401 or a redirect, user A succeeds, and user B gets 403 or 404 and changes nothing. Call the exported function directly with a mocked session where you can; this does not need a server.
- **Middleware bypass test.** If the version is in the CVE-2025-29927 range, also send one request to a protected route on the local server only and show that the handler itself refuses it after the fix.
- **Bundle test.** After `next build`, scan `.next/static` for the value of every non-`NEXT_PUBLIC_` variable in the env files, and for `NEXT_PUBLIC_` names that look like secrets. The test fails if any is found.

Run each test and keep the output. A test that fails before the fix and passes after it is the proof. If you cannot run tests here (no installed dependencies, no network for `npm install`), write them anyway, label the finding Likely, and give the exact command to run them.

## Step 4: Fix

Make the smallest change:

- Add a session and ownership check inside the handler or action, using the app's own auth helper. Keep middleware as a first filter, not the only one.
- Validate action input with the schema library the app already uses (for example `zod`).
- Move secrets out of `NEXT_PUBLIC_`, read them only in server code, and add `import 'server-only'` to the module. Tell the user to rotate any secret that was exposed in a build or a commit. You cannot rotate it for them.
- Pass only the fields the client needs.
- Allow only relative redirect paths that start with `/` and not `//`.
- Upgrade Next.js to at least the safe floor in the CVE table, with the project's package manager.

Rerun the tests. Do not weaken a test to make it pass.

## Step 5: Record

Write `security-findings/<id>.md` for every Proven and Likely issue, and list Ruled out checks in `security-findings/index.md`. Use the format in [references/record.md](references/record.md). IDs look like `NEXT-001-server-action-no-auth`.

Finish with a short summary in chat: a table of findings with label, severity and file, the tests you added and how to run them, the fixes you applied, and anything left to do, such as rotating a secret.

## Remote audit

This skill tests code and local servers only. To test the deployed site, run a remote audit with the `agentproof-production-audit` skill, in which AgentProof's agents test the live app. Remote audits require an AgentProof account to get started: https://isagentproof.com.
