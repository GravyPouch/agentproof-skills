# PostgreSQL checks in detail

Run the SQL with `psql "$PGURL" -v ON_ERROR_STOP=1`, read-only:

```sh
PGOPTIONS='-c default_transaction_read_only=on' psql "$PGURL" -v ON_ERROR_STOP=1 -f query.sql
```

Run the catalog queries twice when you can: once as an admin role on the local database (to see everything) and once as the app role (to see what the app can see). Also read the migration files, because the local database may not match production exactly.

## 1. App role

Find the role the app connects as: the user in `DATABASE_URL`, `PGUSER`, the ORM config or the connection pool settings.

```sql
SELECT rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolinherit
FROM pg_roles WHERE rolname = current_user;

-- Roles the app role is a member of (inherited privileges)
SELECT r.rolname AS member_of
FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.roleid
WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = current_user);

-- Tables owned by the app role
SELECT n.nspname, c.relname, pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p') AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1, 2;
```

Findings: the app role is a superuser or has `BYPASSRLS`; it owns tables that rely on RLS without `FORCE`; it can create roles or databases; it is a member of a role that can.

## 2. `PUBLIC` and default privileges

```sql
-- Can everyone create objects in public? (true before PostgreSQL 15 unless revoked)
SELECT has_schema_privilege('public', 'public', 'CREATE') AS public_can_create;

-- Table privileges granted to PUBLIC
SELECT table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'PUBLIC' AND table_schema NOT IN ('pg_catalog', 'information_schema');

-- Functions any role can execute (EXECUTE is granted to PUBLIC by default)
SELECT p.oid::regprocedure AS function, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND has_function_privilege('public', p.oid, 'EXECUTE');

-- Default privileges for future objects
SELECT pg_get_userbyid(defaclrole) AS for_role, defaclnamespace::regnamespace AS schema,
       defaclobjtype AS type, defaclacl
FROM pg_default_acl;
```

In `psql`, `\dn+`, `\dp` and `\ddp` show the same data.

## 3. Row-level security

Find tenant and user tables:

```sql
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE column_name IN ('tenant_id', 'org_id', 'organization_id', 'account_id', 'workspace_id', 'team_id', 'user_id', 'owner_id')
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1, 2;
```

Check RLS state and policies:

```sql
SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced, pg_get_userbyid(c.relowner) AS owner,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p') AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1, 2;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies ORDER BY 1, 2;
```

Findings:

- A tenant table with `rls_enabled = false`.
- `rls_enabled = true` with zero policies: nobody but the owner sees rows. Often a sign that the app connects as the owner, which skips RLS.
- `rls_forced = false` while the app role owns the table.
- A policy whose `qual` is `true`, or that reads the tenant from a setting the app does not set. `current_setting('app.tenant_id', true)` returns null when the setting was never set in the session, and an empty string after it was set and reset, so `::uuid` on it can fail. Write `nullif(current_setting('app.tenant_id', true), '')::uuid` and check that a missing tenant matches no rows.
- An `INSERT` or `UPDATE` policy with no `with_check`, so a tenant can write rows for another tenant.
- `PERMISSIVE` policies that combine with `OR` into something wider than intended.

Views: on PostgreSQL 15 and later, a view over a tenant table must be created `WITH (security_invoker = true)`, or it runs with the view owner's rights and skips RLS.

```sql
SELECT n.nspname, c.relname, c.reloptions
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' AND n.nspname NOT IN ('pg_catalog', 'information_schema');
```

## 4. `SECURITY DEFINER` functions

```sql
SELECT p.oid::regprocedure AS function,
       pg_get_userbyid(p.proowner) AS owner,
       p.proconfig AS settings,
       has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef AND n.nspname NOT IN ('pg_catalog', 'information_schema');
```

A `SECURITY DEFINER` function runs with its owner's rights. It is unsafe when:

- `settings` has no `search_path=…` entry. The caller's `search_path` then decides which tables and functions an unqualified name resolves to. A caller who can create objects in any schema on that path can shadow `invoices` or `lower()` and run code as the owner.
- `search_path` includes a schema that untrusted roles can create objects in (check with `has_schema_privilege(role, schema, 'CREATE')`), or `pg_temp` is not listed last. If `pg_temp` is not listed at all, PostgreSQL searches it first.
- `public_execute` is true and the function does not check who is calling.
- Its body takes a tenant ID from an argument instead of from the session, so any caller can ask for any tenant.
- Its body uses `EXECUTE` with concatenated input.

Read each body with `SELECT pg_get_functiondef('name(args)'::regprocedure);` or in the migrations. The PostgreSQL manual's section "Writing SECURITY DEFINER Functions Safely" (https://www.postgresql.org/docs/current/sql-createfunction.html) describes the safe pattern:

```sql
ALTER FUNCTION invoice_total(uuid) SET search_path = pg_catalog, app, pg_temp;
REVOKE EXECUTE ON FUNCTION invoice_total(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION invoice_total(uuid) TO app_user;
```

## 5. Extensions

```sql
SELECT extname, extversion, extnamespace::regnamespace FROM pg_extension ORDER BY 1;
SELECT lanname, lanpltrusted FROM pg_language WHERE lanname NOT IN ('internal', 'c', 'sql');
```

- Match installed contrib extensions against the contrib rows in [cves.md](cves.md).
- Untrusted languages (`lanpltrusted = false`, such as `plperlu` and `plpython3u`) let function authors run code on the server. Only superusers should create such functions.
- `dblink`, `postgres_fdw` and `file_fdw` reach other servers or files. Check which roles can use them and their user mappings (`SELECT * FROM pg_user_mappings`).

## 6. Connections and SSL

```sql
SHOW ssl;
SHOW password_encryption;
SHOW listen_addresses;
SELECT type, database, user_name, address, netmask, auth_method FROM pg_hba_file_rules;  -- needs superuser
```

Findings: `trust` for anything other than local sockets in a development setup; `password` (clear text) or `md5` for remote hosts; `0.0.0.0/0` or `::/0` with password auth on a server reachable from the internet; `ssl = off` on a server reached over a network; `password_encryption = md5` (see CVE-2026-6478). On managed services, read the provider's settings instead.

In app config, look at `sslmode` in connection strings: `disable` or no setting to a remote host is a finding; `require` encrypts without checking the certificate; `verify-full` checks both.

## 7. SQL injection

Search app code for SQL built from strings:

```sh
# JavaScript and TypeScript
rg -n "(query|execute|raw|unsafe)\s*\(\s*[\`'\"].*(\\$\{|\+\s*\w)" --glob '!node_modules'
rg -n "\\\$queryRawUnsafe|\\\$executeRawUnsafe|sql\.raw|knex\.raw|sequelize\.query|Prisma\.raw" --glob '!node_modules'
# Python
rg -n "execute\(\s*f[\"']|execute\([^)]*%\s|execute\([^)]*\.format\(" --glob '!.venv'
# Go
rg -n "(Query|Exec|QueryRow)(Context)?\([^)]*fmt\.Sprintf|(Query|Exec)\([^)]*\+\s*\w"
# Ruby
rg -n "where\(\s*\"[^\"]*#\{|find_by_sql\(\s*\"[^\"]*#\{|execute\(\s*\"[^\"]*#\{"
# SQL functions
rg -n "EXECUTE\s+'[^']*'\s*\|\||format\([^)]*%s" --glob '*.sql'
```

A query that concatenates any value from a request, a file, another table or a function argument is a finding. Tagged templates such as `sql\`… ${x}\`` in `postgres.js`, Drizzle's `sql` or Prisma's `$queryRaw` are parameterized and safe; `$queryRawUnsafe` and `sql.raw` are not.

Safe forms:

```js
await pool.query("SELECT * FROM invoices WHERE tenant_id = $1 AND status = $2", [tenantId, status]);
```

```sql
EXECUTE format('SELECT count(*) FROM %I WHERE tenant_id = $1', table_name) USING p_tenant;
```

For a column or table name from input, check it against a fixed list before using it.

## 8. Exposed connection strings

```sh
rg -n "postgres(ql)?://[^:/\s]+:[^@\s]+@" --glob '!node_modules' .
git ls-files | rg '(^|/)\.env'
rg -n "(NEXT_PUBLIC|VITE|EXPO_PUBLIC|PUBLIC)_[A-Z_]*(DATABASE|DB|PG)[A-Z_]*" --glob '!node_modules'
git log -p --all -S 'postgres://' --oneline | head -50   # past commits
```

A real password in a tracked file or past commit is a finding even if it was removed later. Example values in documentation such as `postgres:postgres@localhost` are not, unless the same password is used elsewhere.
