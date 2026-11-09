# PostgreSQL security test templates

Two forms: plain SQL files that `psql` runs (no extra tools), or pgTAP tests if the project already uses pgTAP (`pg_prove`). Each file runs in a transaction and ends with `ROLLBACK`, so it leaves no data behind. Run them only on the local test database.

Name each file after the finding ID, for example `tests/security/PG-001-invoices-tenant-isolation.sql`.

Run one:

```sh
psql "$PGURL" -v ON_ERROR_STOP=1 -f tests/security/PG-001-invoices-tenant-isolation.sql
```

A failed assertion raises an exception, so `psql` exits with a non-zero status and the test fails.

## Assertion helper

Put this at the top of each plain SQL test. It lives in `pg_temp`, so it disappears with the session.

```sql
BEGIN;
CREATE FUNCTION pg_temp.assert(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', message; END IF;
  RAISE NOTICE 'ok: %', message;
END $$;
```

## App role

```sql
-- PG-002: the app role cannot skip row-level security
SELECT pg_temp.assert(NOT rolsuper, 'app_user is not a superuser') FROM pg_roles WHERE rolname = 'app_user';
SELECT pg_temp.assert(NOT rolbypassrls, 'app_user does not have BYPASSRLS') FROM pg_roles WHERE rolname = 'app_user';
SELECT pg_temp.assert(
  NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND pg_get_userbyid(c.relowner) = 'app_user'),
  'app_user owns no tables');
ROLLBACK;
```

## Tenant isolation: app role, tenant A, tenant B

Seed as the admin role, then switch to the app role and set the tenant the same way the app does. Replace `app.tenant_id` with the setting, function or JWT claim the policies read.

```sql
-- PG-001: tenant B cannot read or change tenant A's invoices
-- (helper from above)
INSERT INTO tenants (id, name) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'Tenant A'),
  ('00000000-0000-0000-0000-00000000000b', 'Tenant B');
INSERT INTO invoices (id, tenant_id, total) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 100),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 200);

SELECT pg_temp.assert(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.invoices'::regclass),
  'invoices has row-level security enabled and forced');

SET LOCAL ROLE app_user;

-- Tenant A sees only its own rows
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
SELECT pg_temp.assert((SELECT count(*) FROM invoices) = 1, 'tenant A sees 1 invoice');
SELECT pg_temp.assert(
  NOT EXISTS (SELECT 1 FROM invoices WHERE tenant_id = '00000000-0000-0000-0000-00000000000b'),
  'tenant A cannot see tenant B rows');

-- Tenant B cannot change tenant A's rows
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000b';
WITH changed AS (
  UPDATE invoices SET total = 0 WHERE id = '10000000-0000-0000-0000-000000000001' RETURNING 1
)
SELECT pg_temp.assert((SELECT count(*) FROM changed) = 0, 'tenant B cannot update tenant A invoice');

-- Tenant B cannot insert a row for tenant A
DO $$
BEGIN
  INSERT INTO invoices (id, tenant_id, total)
  VALUES ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 1);
  RAISE EXCEPTION 'FAIL: tenant B inserted a row for tenant A';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: tenant B cannot insert for tenant A';
END $$;

-- No tenant set: no rows
RESET app.tenant_id;
SELECT pg_temp.assert((SELECT count(*) FROM invoices) = 0, 'no tenant set returns no rows');

ROLLBACK;
```

`RAISE EXCEPTION 'FAIL…'` inside a `DO` block with an `EXCEPTION` handler that catches only `insufficient_privilege` still fails the test, because the handler does not catch `raise_exception`. Row-level security `WITH CHECK` violations raise `insufficient_privilege` (SQLSTATE 42501). A missing `INSERT` grant raises the same code, so first check that the app role has the grant, or the insert test passes for the wrong reason.

The policies here read `nullif(current_setting('app.tenant_id', true), '')::uuid`. After `RESET`, the setting is an empty string, not null, and a plain `::uuid` cast raises an error instead of matching no rows.

## `SECURITY DEFINER` functions

```sql
-- PG-003: SECURITY DEFINER functions pin search_path and are not public
SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) s WHERE s LIKE 'search_path=%')
  ), 'every SECURITY DEFINER function sets search_path');

SELECT pg_temp.assert(
  NOT has_function_privilege('public', 'public.invoice_total(uuid)', 'EXECUTE'),
  'invoice_total is not executable by PUBLIC');

-- Calling as tenant B must not return tenant A's data
SET LOCAL ROLE app_user;
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000b';
SELECT pg_temp.assert(
  coalesce(invoice_total('00000000-0000-0000-0000-00000000000a'), 0) = 0,
  'tenant B cannot read tenant A total through invoice_total');
ROLLBACK;
```

## pgTAP form

If the project uses pgTAP:

```sql
BEGIN;
SELECT plan(3);
SET LOCAL ROLE app_user;
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
SELECT is((SELECT count(*)::int FROM invoices), 1, 'tenant A sees 1 invoice');
SELECT is_empty($$ SELECT 1 FROM invoices WHERE tenant_id = '00000000-0000-0000-0000-00000000000b' $$, 'tenant A cannot see tenant B rows');
SELECT throws_ok($$ INSERT INTO invoices (id, tenant_id, total) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-00000000000b', 1) $$, '42501', NULL, 'tenant A cannot insert for tenant B');
SELECT * FROM finish();
ROLLBACK;
```

Run with `pg_prove -d "$PGURL" tests/security/*.sql`.

## Injection test in app code

Write it in the app's test framework, against the local database. Example with `node:test` and `pg`:

```js
// tests/security/PG-004-invoice-search-injection.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { listInvoices } from "../../src/invoices.js";

test("PG-004 a quote in the status filter is treated as data", async () => {
  const rows = await listInvoices("00000000-0000-0000-0000-00000000000b", "paid' OR '1'='1");
  assert.equal(rows.length, 0);
});
```

Before the fix, the input changes the query and returns other tenants' rows, or raises a syntax error that shows the input reached the SQL text. Either result proves it. After the fix, it returns no rows.
