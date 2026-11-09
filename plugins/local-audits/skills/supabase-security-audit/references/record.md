# Recording findings

Write one Markdown file per Proven or Likely finding in `security-findings/` at the project root, plus `security-findings/index.md`. The sections follow AgentProof's case-file format: what was sent, what came back, the fix, and the result when it was tried again.

## File name and ID

`security-findings/SUPA-<nnn>-<short-slug>.md`, numbered in the order you find them, for example `security-findings/SUPA-001-notes-no-rls.md`.

## Template

````markdown
# SUPA-001: Anyone with the anon key can read and change every note

- Label: Proven | Likely
- Severity: Critical | High | Medium | Low
- Location: supabase/migrations/20260101000000_init.sql:20 (table `public.notes`)
- Checked by: supabase-security-audit
- Date: YYYY-MM-DD

## Claim

One plain sentence: who can do what they should not. Example: "A signed-out visitor can read and change every user's notes with the public anon key, because public.notes has no row-level security."

## Evidence

SENT: what the test did, for example `anon().from("notes").select("*")` against the local stack.
CAME BACK: what happened, for example "2 rows, including user A's private note".

Include the migration lines, query output or code lines that cause it. Redact keys to the first 4 characters and their location.

## Reproduction

- Test: `tests/security/SUPA-001-notes-rls.test.mjs`
- Command: `supabase start && eval "$(supabase status -o env)" && node --test tests/security/SUPA-001-notes-rls.test.mjs`
- Result before the fix: 4 failed, 1 passed. (For Likely: "Not run: <reason>. Run the command above after <step>.")

## Fix

New migration from `supabase migration new notes_rls`:

```sql
alter table public.notes enable row level security;
create policy "Users read own notes" on public.notes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users write own notes" on public.notes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
```

For code changes, show a diff.

## Retest

TRIED AGAIN: the same command.
Result after the fix: 5 passed, after `supabase db reset`. (For Likely: "Not run".)

## Follow-up

Anything the user must do that code cannot, such as rotating an exposed `service_role` key in the dashboard or applying the migration to the hosted project after review. Leave out the section when there is nothing.
````

## Severity

- **Critical:** anyone with the anon key can read or change private data, or a `service_role` or secret key ships to clients.
- **High:** a signed-in user can read or change another user's rows or files, or call a private RPC function.
- **Medium:** a weakness that needs another flaw, such as a SECURITY DEFINER function without search_path that is not reachable by anon, or missing upload limits.
- **Low:** hardening gaps with little direct impact.

## index.md

```markdown
# Security findings

Audit by supabase-security-audit on YYYY-MM-DD. @supabase/supabase-js <version>, Supabase CLI <version>, PostgreSQL <version> (local stack).

| ID | Finding | Label | Severity | Fixed | Test |
| --- | --- | --- | --- | --- | --- |
| SUPA-001 | public.notes has no row-level security | Proven | Critical | Yes | tests/security/SUPA-001-notes-rls.test.mjs |

## Ruled out

- Edge Functions: none in supabase/functions.
```
