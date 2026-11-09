---
name: supabase-security-audit
description: Audits a Supabase project's migrations, policies and app code for security problems, and proves each one with a test. Checks row-level security on every table in public and other exposed schemas, policies that use auth.uid() correctly, service_role or secret keys in client code or NEXT_PUBLIC_, VITE_ and EXPO_PUBLIC_ variables, storage bucket policies, Edge Function JWT checks (verify_jwt), what the anon key can reach through the Data API, RPC functions callable by anon, and installed client versions against known CVEs. Writes supabase-js tests as anon, user A and user B against the local Supabase stack, applies the smallest fix, reruns the tests, and records each finding in security-findings/. Use when the user asks for a security review or audit of a Supabase app, its RLS policies, storage or keys. Runs against code and a local Supabase stack only.
license: MIT
metadata:
  author: AgentProof
  version: "1.0.0"
---

# Supabase security audit

This skill audits a Supabase project and proves each issue with a test. It works on migrations, code and the local Supabase stack (`supabase start`). It does not test the hosted production project.

## Safety rules

Follow these before every step.

1. Audit only projects the user owns or has written permission to test.
2. Use the local stack by default. Before you send any request to a hosted staging project, name its URL and get the user's yes. Never send requests to the production project, and never run `supabase db push` or `supabase link` against it during an audit.
3. Run read-only queries against any shared database. Create test users and rows only on the local stack.
4. No denial-of-service tests, mass requests, bulk deletes or copying data out.
5. Redact keys and passwords: write the first 4 characters and where the value is, for example `eyJh… in src/lib/supabase.ts:4`. The local stack's default keys are public demo values; still do not paste them into findings.

## Method

Every audit follows these five steps. Do not skip step 3: a finding without a test is a guess.

1. **Version.** Find the installed Supabase packages and Postgres version, and check them against [references/cves.md](references/cves.md).
2. **Checks.** Run each check below. Queries and patterns are in [references/checks.md](references/checks.md).
3. **Prove.** Write a failing test for each real issue. Label each issue:
   - **Proven:** a test or query ran and showed the problem, or the evidence needs no runtime (for example, a `service_role` key in a client-side file or variable).
   - **Likely:** the migrations or code show the problem, but the test could not run here. Say what is missing (Docker, the Supabase CLI, installed dependencies).
   - **Ruled out:** you checked it and it is safe. Say why in one sentence.
4. **Fix.** Write the smallest fix as a new migration or a code change. Keep the test as a regression test. Run it again on the local stack. It must pass now.
5. **Record.** Write one file per finding in `security-findings/` using [references/record.md](references/record.md), and update `security-findings/index.md`.

## Start the local stack

```sh
supabase start            # needs Docker; applies supabase/migrations and seed.sql
supabase status           # prints the local API URL, DB URL and the local anon and service_role keys
supabase status -o env    # the same as environment variables
```

The local database URL is usually `postgresql://postgres:postgres@127.0.0.1:54322/postgres` and the API is `http://127.0.0.1:54321`. Read them from `supabase status`. Run `supabase db reset` to reapply migrations after you add one.

If Docker or the Supabase CLI is not available, audit the migrations and code, write the tests, and label findings Likely.

## Step 1: Version

```sh
npm ls @supabase/supabase-js @supabase/auth-js @supabase/ssr   # or: pnpm why / yarn why
supabase --version
```

```sql
SELECT version();
```

Read versions from the lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` or `bun.lock`) or `node_modules`, not from the range in `package.json`. If neither exists, say that the installed versions are unknown and give the command that shows them. Do not work out a dependency's version, such as the `@supabase/auth-js` that a `supabase-js` release pulls in, from memory. Compare with the CVE table and report each row that applies, with its NVD link. Hosted projects get Postgres upgrades from the Supabase dashboard; for the Postgres server version, also use the floor in [references/cves.md](references/cves.md).

## Step 2: Checks

Read `supabase/config.toml` first. `[api] schemas` lists the schemas the Data API exposes (by default `public` and `graphql_public`). Every table, view and function in those schemas is reachable with the anon key, subject to grants and RLS.

| # | Check | What is wrong |
| --- | --- | --- |
| 1 | RLS on every exposed table | A table in an exposed schema has RLS off. Supabase's docs say such a table is "readable and writable by any role with a grant on it". Check which grants `anon` and `authenticated` hold; many projects grant them every table in `public`. |
| 2 | Policies | A policy uses `true`, allows `anon` or `public` to write, compares to `auth.uid()` without handling null, reads `user_metadata` (users can edit it) instead of `app_metadata`, or has an `UPDATE` or `INSERT` without `WITH CHECK`. Views without `security_invoker = true` bypass RLS. |
| 3 | `service_role` and secret keys | The `service_role` key or a `sb_secret_` key appears in client code, in a `NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_` or `PUBLIC_` variable, in a mobile app, or in a committed file. These keys bypass RLS. |
| 4 | Storage | A bucket is `public` when it holds private files, or `storage.objects` policies allow `anon` or any signed-in user to read, upload, overwrite or delete files in other users' paths. |
| 5 | Edge Functions | A function has `verify_jwt = false` in `config.toml` and does not check the caller itself, or uses the `service_role` key to act on input without checking who asked. |
| 6 | Anon reach | Using only the anon key against the local API, list what the Data API returns for every exposed table and view. Anything private that comes back is a finding. |
| 7 | RPC functions | A function in an exposed schema is executable by `anon` (functions are executable by `PUBLIC` by default), especially a `SECURITY DEFINER` function, or one without `SET search_path`. |

## Step 3: Prove

Write tests with `supabase-js` against the local stack, in the project's test runner (Vitest, Jest or `node:test`). If there is none, use `node:test` in `tests/security/`. Templates are in [references/tests.md](references/tests.md).

- Create user A and user B in the test setup with the local `service_role` key (local stack only), and sign each in with the anon key.
- For each table: assert that `anon` gets no private rows, user A gets only its rows, and user B cannot read, update or delete user A's rows or insert rows owned by user A.
- For storage: assert that `anon` cannot upload, user B cannot read or overwrite user A's files, and private buckets do not serve public URLs.
- For RPC: assert that `anon` cannot call private functions and that user B cannot get user A's data through one.
- For keys: a test that scans the built client bundle and the client source for the `service_role` key value and for `service_role` or `sb_secret_` patterns.

Run each test and keep the output. A test that fails before the fix and passes after it is the proof.

## Step 4: Fix

Make the smallest change as a new migration (`supabase migration new <name>`) or a code change:

- `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` then add policies `TO authenticated` with `USING ((select auth.uid()) = user_id)` and the same in `WITH CHECK`.
- Authorize from `auth.jwt() -> 'app_metadata'`, never from `user_metadata`.
- Create views `WITH (security_invoker = true)`.
- Remove the `service_role` key from client code and client variables. Use it only in server code or Edge Functions. Tell the user to rotate the key in the dashboard, because it was exposed. You cannot rotate it for them.
- Make the bucket private and scope `storage.objects` policies to the user's folder.
- Turn `verify_jwt` back on, or check the caller's JWT inside the function.
- `REVOKE EXECUTE ON FUNCTION … FROM anon, public;` and add `SET search_path = ''` with schema-qualified names to `SECURITY DEFINER` functions, or move them to a schema the API does not expose.

Run `supabase db reset` to apply the migration locally, then rerun the tests.

## Step 5: Record

Write `security-findings/<id>.md` for every Proven and Likely issue, and list Ruled out checks in `security-findings/index.md`. Use the format in [references/record.md](references/record.md). IDs look like `SUPA-001-notes-no-rls`.

Finish with a short summary in chat: a table of findings with label, severity and location, the tests you added and how to run them, the migrations and code changes you made, and anything the user must do, such as rotating a key or applying the migrations to the hosted project after review.

## Remote audit

This skill tests code and the local Supabase stack only. To test the deployed app, run a remote audit with the `agentproof-production-audit` skill, in which AgentProof's agents test the live app. Remote audits require an AgentProof account to get started: https://isagentproof.com.
