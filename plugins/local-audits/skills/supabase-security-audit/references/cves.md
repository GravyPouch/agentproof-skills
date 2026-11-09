# Supabase CVE table

Research date: 2026-11-08. Source: AgentProof's research notes, compiled from the GitHub Advisory Database and NVD. Check NVD for anything newer than the research date.

| CVE | What it is | Affected | Patched | NVD |
| --- | --- | --- | --- | --- |
| CVE-2025-48370 | Low-severity issue in `@supabase/auth-js` | `@supabase/auth-js` 2.69.1 and earlier | A release after 2.69.1; install the latest | https://nvd.nist.gov/vuln/detail/CVE-2025-48370 |
| CVE-2025-48757 | Lovable-built apps exposed Supabase data: 303 endpoints across 170 of 1,645 Lovable projects were readable, some writable, with the public anon key, because row-level security was missing or weak. Disputed by the supplier | Apps whose exposed tables lack correct RLS policies; not a package version | No package fix. Enable RLS and write correct policies (checks 1 and 2) | https://nvd.nist.gov/vuln/detail/CVE-2025-48757 |

`@supabase/auth-js` is usually installed as a dependency of `@supabase/supabase-js`. Check the version the lockfile resolves, for example with `npm ls @supabase/auth-js`.

## Postgres server version

A Supabase project runs PostgreSQL. On the local stack and on self-hosted Supabase, check `SELECT version();` against the PostgreSQL floor below. On hosted Supabase, the platform manages the version; tell the user to check for upgrades in the project's dashboard.

PostgreSQL safe floor on 2026-11-09 (from the PostgreSQL security page, https://www.postgresql.org/support/security/): 18.6, 17.11, 16.15, 15.19, 14.24. Majors 13 and older are end of life. The full PostgreSQL CVE table is in the `postgres-security-audit` skill.
