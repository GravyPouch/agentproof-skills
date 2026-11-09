---
name: postgres-security-audit
description: Audits a PostgreSQL database and the app code that queries it for security problems, and proves each one with a test. Checks the server version against PostgreSQL CVEs, the app role versus owner and superuser, PUBLIC and default privileges, row-level security enabled and forced on tenant tables, SECURITY DEFINER functions with an unsafe search_path, extensions, pg_hba and SSL settings, SQL injection in raw or dynamic SQL in app code and functions, and exposed connection strings. Writes SQL or pgTAP tests as the app role, tenant A and tenant B, applies the smallest fix, reruns the tests, and records each finding in security-findings/. Use when the user asks for a security review or audit of a Postgres schema, migrations, RLS, roles or database queries. Uses read-only queries against a local or staging database only.
license: MIT
metadata:
  author: AgentProof
  version: "1.0.0"
---

# PostgreSQL security audit

This skill audits a PostgreSQL schema, its settings and the app code that queries it, and proves each issue with a test. It works on migrations, code and a local or staging database. It does not touch production.

## Safety rules

Follow these before every step.

1. Audit only databases and code the user owns or has written permission to test.
2. Use a local database by default: a Docker container or a local server loaded from the project's migrations. Before you connect to a staging database, name the host and database and get the user's yes. Never connect to production.
3. Run read-only queries. Start every session with `SET default_transaction_read_only = on`, or connect with `PGOPTIONS='-c default_transaction_read_only=on'`. Run tests inside a transaction that ends in `ROLLBACK`. Change a schema or data only on a local database, or with the user's approval.
4. No denial-of-service tests, no `DROP`, `TRUNCATE` or bulk `DELETE` outside a local test database, no mass scanning and no copying data out.
5. Redact secrets: for passwords and connection strings, write the first 4 characters and where they are, for example `postgres://app:hunt…@db:5432 in .env:2`.

## Method

Every audit follows these five steps. Do not skip step 3: a finding without a test is a guess.

1. **Version.** Find the server version and check it against [references/cves.md](references/cves.md).
2. **Checks.** Run each check below. Queries and patterns are in [references/checks.md](references/checks.md).
3. **Prove.** Write a failing SQL test or a local reproduction for each real issue. Label each issue:
   - **Proven:** a test or query ran and showed the problem, or the evidence needs no runtime (for example, a password committed in a connection string, or a catalog query result).
   - **Likely:** the migrations or code show the problem, but the test could not run here. Say what is missing (Docker, `psql`, a database).
   - **Ruled out:** you checked it and it is safe. Say why in one sentence.
4. **Fix.** Write the smallest fix as a new migration or a code change. Keep the test as a regression test. Run it again on the local database. It must pass now.
5. **Record.** Write one file per finding in `security-findings/` using [references/record.md](references/record.md), and update `security-findings/index.md`.

## Set up a local database

If the project has no local database, start one with the same major version as production and load the migrations:

```sh
docker run --rm -d --name pg-audit -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:17
export PGURL=postgres://postgres:postgres@127.0.0.1:55432/postgres
psql "$PGURL" -v ON_ERROR_STOP=1 -f db/schema.sql      # or run the project's migration tool
```

Use the migration tool the project already uses (for example `prisma migrate deploy`, `drizzle-kit migrate`, `knex migrate:latest`, `alembic upgrade head`, `rails db:migrate`) with `DATABASE_URL` pointing at the container. Stop the container with `docker stop pg-audit` when you finish.

If Docker or `psql` is not available, audit the migration files and code, write the tests, and label findings Likely.

## Step 1: Version

```sql
SHOW server_version;
SELECT version();
```

Compare the major and minor version with the CVE table. Report every row that applies, with its NVD link. A minor below the safe floor for its major is a finding. Majors 13 and older are end of life and get no security fixes. On a managed service (RDS, Cloud SQL, Azure, Supabase, Neon), the provider sets the minor version; tell the user where to upgrade it.

## Step 2: Checks

| # | Check | What is wrong |
| --- | --- | --- |
| 1 | App role | The app connects as a superuser, as the owner of its tables, or as a role with `BYPASSRLS`, `CREATEROLE` or `CREATEDB`. Owners and superusers skip row-level security unless it is forced. |
| 2 | `PUBLIC` and default privileges | `CREATE` on schema `public` for `PUBLIC` (the default before PostgreSQL 15), `EXECUTE` on functions for `PUBLIC` (the default for new functions), table grants to `PUBLIC`, or default privileges that grant too much to future objects. |
| 3 | Row-level security | A table with tenant or user data (a `tenant_id`, `org_id`, `account_id`, `workspace_id` or `user_id` column) has RLS off, has RLS on but not `FORCE`d while the app role owns it, has no policy, or has a policy without `WITH CHECK` for writes. Views over such tables bypass RLS unless they use `security_invoker = true` (PostgreSQL 15 and later). |
| 4 | `SECURITY DEFINER` functions | A `SECURITY DEFINER` function has no `SET search_path`, or its `search_path` includes a schema that untrusted roles can write to, or `pg_temp` is not last. Also: `EXECUTE` still granted to `PUBLIC`, dynamic SQL inside it, or a superuser owner. |
| 5 | Extensions | Installed extensions and versions, untrusted languages (`plperlu`, `plpython3u`), and extensions with fixes in the CVE table (`pgcrypto`, `pg_trgm`, `intarray`, `fuzzystrmatch`, `refint`, `pg_stat_statements`, `amcheck`). Who can use `dblink`, `postgres_fdw` or `file_fdw`. |
| 6 | Connections and SSL | `pg_hba.conf` lines with `trust`, `password` or `md5` from non-local addresses, `0.0.0.0/0` rules, `ssl = off`, `password_encryption = md5`. App connection strings without `sslmode=verify-full` or `require` to a remote host. |
| 7 | SQL injection | App code or functions build SQL with string concatenation, template literals, f-strings or `format('%s')`, or pass user input to `EXECUTE`, `query()`, `$queryRawUnsafe`, `sql.raw`, `knex.raw` or similar without parameters. |
| 8 | Exposed connection strings | Database URLs with passwords committed to the repository, in client-side variables (`NEXT_PUBLIC_`, `VITE_`), in logs, or in Docker files. |

## Step 3: Prove

Write the tests as SQL files the project can run with `psql`, or with pgTAP if the project uses it. Templates are in [references/tests.md](references/tests.md). Put them in `tests/security/` unless the project keeps database tests elsewhere.

- **Role tests.** As the app role, assert that it is not a superuser, does not own tenant tables and has no `BYPASSRLS`.
- **Tenant tests.** Seed two tenants. Inside a transaction, `SET LOCAL ROLE` to the app role and set the tenant the way the app does (for example `SET LOCAL app.tenant_id = '…'`). Assert that tenant A sees only its rows, that tenant B cannot read, update or delete tenant A's rows, and that inserts for another tenant fail.
- **Function tests.** Assert that every `SECURITY DEFINER` function has a safe `search_path` and is not executable by `PUBLIC`, and that calling it as tenant B does not return tenant A's data.
- **Injection tests.** For each unsafe query in app code, write a test in the app's test framework that passes a value containing a quote, such as `' OR '1'='1`, and asserts that it returns no extra rows or fails as a normal value. After the fix, the same input is treated as data.

Run each test on the local database and keep the output. A test that fails before the fix and passes after it is the proof.

## Step 4: Fix

Make the smallest change, as a new migration file in the project's migration folder:

- Create a separate app role that owns nothing, `NOSUPERUSER NOBYPASSRLS`, with only the grants it needs. Keep a different role as the table owner.
- `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`, then add policies with both `USING` and `WITH CHECK`.
- `ALTER FUNCTION … SET search_path = pg_catalog, <trusted schema>, pg_temp` and `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC`, then grant `EXECUTE` to the roles that need it.
- `REVOKE CREATE ON SCHEMA public FROM PUBLIC`.
- In app code, use the driver's parameters (`$1`, `?`, named parameters). For identifiers, use an allow-list or `format('%I', …)` in SQL. Never use `format('%s', …)` for values.
- Move connection strings into server-only environment variables. Tell the user to change any password that was committed. You cannot change it for them.
- Upgrade to at least the safe floor minor for the major version.

Apply the migration to the local database only, then rerun the tests.

## Step 5: Record

Write `security-findings/<id>.md` for every Proven and Likely issue, and list Ruled out checks in `security-findings/index.md`. Use the format in [references/record.md](references/record.md). IDs look like `PG-001-invoices-no-rls`.

Finish with a short summary in chat: a table of findings with label, severity and location, the tests you added and how to run them, the migrations and code changes you made, and anything the user must do, such as changing a password or upgrading a managed database.

## Remote audit

This skill tests code and local or staging databases only. To test the deployed app that uses this database, run a remote audit with the `agentproof-production-audit` skill, in which AgentProof's agents test the live app. Remote audits require an AgentProof account to get started: https://isagentproof.com.
