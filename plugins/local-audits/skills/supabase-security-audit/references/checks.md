# Supabase checks in detail

Run SQL against the local database from `supabase status`:

```sh
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f query.sql
```

Without a running stack, read `supabase/migrations/*.sql` in order and track each table, policy, grant and function by hand.

## 1. RLS on every exposed table

Exposed schemas come from `supabase/config.toml`:

```toml
[api]
schemas = ["public", "graphql_public"]
```

```sql
SELECT n.nspname AS schema, c.relname AS table, c.relkind,
       c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') AS authenticated_update
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = ANY (ARRAY['public'])          -- add every schema from [api] schemas
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY 1, 2;
```

- A table (`r` or `p`) with `rls_enabled = false` and a grant to `anon` or `authenticated` is a finding. Its rows are readable, and writable if the grant allows it, by anyone with the anon key.
- RLS on with zero policies blocks everything except the `service_role` key. That is safe but often a sign the app reads it with the `service_role` key from the client.
- In migrations: every `create table` in an exposed schema needs an `alter table … enable row level security` in the same or a later migration.

```sh
rg -n -i "create table" supabase/migrations
rg -n -i "enable row level security" supabase/migrations
```

Views (`v`) and materialized views (`m`) run with the owner's rights unless created `WITH (security_invoker = true)` (Postgres 15 and later), so they bypass RLS. Materialized views have no RLS at all; do not expose them. Foreign tables (`f`) have no RLS either.

## 2. Policies

```sql
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;
```

Findings:

- `qual` or `with_check` is `true` for anything other than intentionally public data.
- `roles` is `{public}` or includes `anon` on `INSERT`, `UPDATE` or `DELETE`.
- An `UPDATE` policy with no `with_check`, so a user can change `user_id` to someone else's.
- A policy compares to `auth.uid()` and the column can be null; `auth.uid()` is null for anonymous requests, and `null = null` is not true, but `user_id IS NULL OR …` patterns can open rows.
- `auth.jwt() -> 'user_metadata'` or `raw_user_meta_data` in a policy. Users can edit `user_metadata` themselves. Authorize from `app_metadata`.
- Policies that join other tables without RLS of their own, or that call functions that leak data.
- Performance and clarity, not a security finding by itself: Supabase recommends `(select auth.uid())` and an explicit `TO authenticated`.

## 3. `service_role` and secret keys

```sh
rg -n "service_role|SERVICE_ROLE|sb_secret_" --glob '!node_modules' --glob '!supabase/.temp' .
rg -n "(NEXT_PUBLIC|VITE|EXPO_PUBLIC|PUBLIC|REACT_APP)_[A-Z_]*(SERVICE|SECRET)[A-Z_]*" --glob '!node_modules' .
git ls-files | rg '(^|/)\.env'
```

- A `service_role` key or a `sb_secret_` key in any file that ships to the browser or a mobile app is a finding: `'use client'` files, `src/` of a Vite or React SPA, Expo apps, `NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`, `PUBLIC_` (SvelteKit) or `REACT_APP_` variables.
- `createClient(url, <service key>)` in code that runs in the browser bypasses every policy.
- Legacy keys are JWTs; decode the payload (the middle part, base64) to see `"role":"service_role"` or `"role":"anon"`. Do not print the key.
- A secret key committed to the repository is a finding even if only server code uses it.
- The anon key and `sb_publishable_` keys are meant to be public. They are safe only when RLS is correct.

## 4. Storage

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets;
SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
```

In migrations, look for `insert into storage.buckets` and `create policy … on storage.objects`.

Findings:

- `public = true` on a bucket that holds private files. Public buckets serve every file by URL without any policy.
- A policy with only `bucket_id = '<bucket>'` for `anon`, `public` or every `authenticated` user on `INSERT`, `UPDATE` or `DELETE`: anyone can upload, overwrite or delete any file in it.
- No path scoping. The usual safe pattern stores files under the user's ID and checks it:

```sql
CREATE POLICY "Users manage own avatar files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);
```

- No `file_size_limit` or `allowed_mime_types` on a bucket that accepts uploads from users (Medium or Low).

## 5. Edge Functions

```sh
ls supabase/functions
rg -n -A2 "^\[functions\." supabase/config.toml
rg -n "SUPABASE_SERVICE_ROLE_KEY|service_role" supabase/functions
```

- `verify_jwt = false` is fine for webhooks that check their own signature (for example Stripe). Otherwise the function must read the `Authorization` header and call `supabase.auth.getUser(token)` itself.
- A function that creates a client with the service role key and then reads or writes rows based on request input, without checking the caller, gives every caller admin rights.
- Check CORS headers: `Access-Control-Allow-Origin: *` with credentials, or reflecting any origin.

## 6. Anon reach through the Data API

Only against the local stack, using the local anon key from `supabase status`:

```sh
API=http://127.0.0.1:54321
ANON=<local anon key from supabase status>
curl -s "$API/rest/v1/notes?select=*&limit=5" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

Do this once per exposed table and view after seeding test rows as two users. Any private row in the response is proof. Also try `GET $API/rest/v1/` which returns the OpenAPI description of exposed tables and functions.

## 7. RPC functions

```sql
SELECT p.oid::regprocedure AS function, p.prosecdef AS security_definer, p.proconfig AS settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' ORDER BY 1;
```

Findings:

- `anon_execute = true` on a function that reads or changes private data.
- `security_definer = true` without `search_path` in `settings`. Supabase recommends `SET search_path = ''` and schema-qualified names inside the body.
- A `SECURITY DEFINER` function that takes a user ID as an argument instead of using `auth.uid()`.
- Trigger functions do not need to be callable through the API; revoke `EXECUTE` from `anon` and `authenticated`.
