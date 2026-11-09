# Recording findings

Write one Markdown file per Proven or Likely finding in `security-findings/` at the project root, plus `security-findings/index.md`. The sections follow AgentProof's case-file format: what was sent, what came back, the fix, and the result when it was tried again.

## File name and ID

`security-findings/PG-<nnn>-<short-slug>.md`, numbered in the order you find them, for example `security-findings/PG-001-invoices-no-rls.md`.

## Template

````markdown
# PG-001: Any tenant can read every tenant's invoices

- Label: Proven | Likely
- Severity: Critical | High | Medium | Low
- Location: db/migrations/001_init.sql:14 (table `invoices`)
- Checked by: postgres-security-audit
- Date: YYYY-MM-DD

## Claim

One plain sentence: who can do what they should not. Example: "The app role can read and change invoices of every tenant, because invoices has no row-level security."

## Evidence

SENT: what the test did, for example `SELECT count(*) FROM invoices` as `app_user` with `app.tenant_id` set to tenant A.
CAME BACK: what happened, for example "2 rows; one belongs to tenant B".

Include the catalog query output or the code lines that cause it. Redact passwords to the first 4 characters and their location.

## Reproduction

- Test: `tests/security/PG-001-invoices-tenant-isolation.sql`
- Command: `psql "$PGURL" -v ON_ERROR_STOP=1 -f tests/security/PG-001-invoices-tenant-isolation.sql`
- Result before the fix: `FAIL: invoices has row-level security enabled and forced`. (For Likely: "Not run: <reason>. Run the command above after <step>.")

## Fix

New migration `db/migrations/002_invoices_rls.sql`:

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY invoices_tenant ON invoices
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
```

For code changes, show a diff.

## Retest

TRIED AGAIN: the same command.
Result after the fix: every assertion prints `ok`. (For Likely: "Not run".)

## Follow-up

Anything the user must do that code cannot, such as changing a committed password or upgrading a managed database's minor version. Leave out the section when there is nothing.
````

## Severity

- **Critical:** anonymous or cross-tenant access to all data, SQL injection reachable from a request, code execution as the database owner, or a committed password for a reachable database.
- **High:** one tenant can read or change another tenant's rows, an unsafe SECURITY DEFINER function callable by the app role, or the app connecting as a superuser.
- **Medium:** a weakness that needs another flaw, such as RLS not forced while a separate owner role exists, or CREATE on public for PUBLIC.
- **Low:** hardening gaps with little direct impact.

## index.md

```markdown
# Security findings

Audit by postgres-security-audit on YYYY-MM-DD. PostgreSQL <version> (<local container or staging host>).

| ID | Finding | Label | Severity | Fixed | Test |
| --- | --- | --- | --- | --- | --- |
| PG-001 | invoices has no row-level security | Proven | High | Yes | tests/security/PG-001-invoices-tenant-isolation.sql |

## Ruled out

- pg_hba.conf: the local container allows only scram-sha-256 from the Docker network.
```
