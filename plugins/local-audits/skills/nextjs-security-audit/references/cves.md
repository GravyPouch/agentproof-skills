# Next.js CVE table

Research date: 2026-11-08. Source: AgentProof's research notes, compiled from the GitHub Advisory Database and NVD. "Patched" is the first fixed release on each line; install the latest patch on your line. Check NVD for anything newer than the research date.

**Safe floor on the research date: 15.5.28 on the 15.x line, 16.4.1 on the 16.x line.** A Next.js version below the floor for its line is a finding. The research notes set this floor after the September and October 2026 image optimizer and `use cache` remote code execution advisories, which have no CVE rows here. For 14.x and older, the research notes record no safe floor; plan an upgrade to 15.5.28, 16.4.1 or later.

| CVE | What it is | Affected | Patched | NVD |
| --- | --- | --- | --- | --- |
| CVE-2025-29927 | The `x-middleware-subrequest` header skips middleware, so authorization done only in middleware is bypassed | 11.1.4 onward, before the patched release on each line | 12.3.5, 13.5.9, 14.2.25, 15.2.3 | https://nvd.nist.gov/vuln/detail/CVE-2025-29927 |
| CVE-2024-34351 | Server Actions SSRF: on self-hosted apps with a Server Action that redirects to a relative path, a modified `Host` header made the server fetch attacker URLs | Before 14.1.1 (first affected version: see NVD) | 14.1.1 | https://nvd.nist.gov/vuln/detail/CVE-2024-34351 |
| CVE-2024-51479 | Authorization bypass | Before 14.2.15 (first affected version: see NVD) | 14.2.15 | https://nvd.nist.gov/vuln/detail/CVE-2024-51479 |
| CVE-2025-57822 | Middleware redirect SSRF | Before the patched release on each line (see NVD) | 14.2.32, 15.4.7 | https://nvd.nist.gov/vuln/detail/CVE-2025-57822 |
| CVE-2025-55182 | React2Shell: unauthenticated remote code execution through crafted requests to React Server Components. Apps supporting RSC were exposed even without Server Functions | `react-server-dom-webpack`, `-parcel` and `-turbopack` 19.0.0, 19.1.0, 19.1.1, 19.2.0, and Next.js App Router releases that bundle them | React packages 19.0.1, 19.1.2, 19.2.1. Next.js (GHSA-9qr9-h5gf-34mp) 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, 16.0.7 | https://nvd.nist.gov/vuln/detail/CVE-2025-55182 |
| CVE-2026-27978 | A null `Origin` header bypassed the Server Actions CSRF check | Before 16.1.7 (see NVD) | 16.1.7 | https://nvd.nist.gov/vuln/detail/CVE-2026-27978 |
| CVE-2026-44573 | Pages Router apps with i18n: locale-less `/_next/data/<buildId>/<page>.json` requests skip middleware or proxy authorization | 12.2.0 to before 15.5.16 and 16.2.5 | 15.5.16, 16.2.5 | https://nvd.nist.gov/vuln/detail/CVE-2026-44573 |
| CVE-2026-44574 | Crafted query parameters change the dynamic route value behind middleware, so protected content renders without the middleware check | 15.4.0 to before 15.5.16 and 16.2.5 | 15.5.16, 16.2.5 | https://nvd.nist.gov/vuln/detail/CVE-2026-44574 |
| CVE-2026-44575 | App Router `.rsc` and segment-prefetch URLs reach a page without matching the middleware or proxy rule | 15.2.0 to before 15.5.16 and 16.2.5 | 15.5.16, 16.2.5 | https://nvd.nist.gov/vuln/detail/CVE-2026-44575 |
| CVE-2026-45109 | The fix for CVE-2026-44575 (https://nvd.nist.gov/vuln/detail/CVE-2026-44575) did not apply to `middleware.ts` with Turbopack | 15.2.0 to before 15.5.18 and 16.2.6 | 15.5.18, 16.2.6 | https://nvd.nist.gov/vuln/detail/CVE-2026-45109 |
| CVE-2026-64649 | Server Actions SSRF on custom servers | Before the patched release on each line (see NVD) | 15.5.21, 16.2.11 | https://nvd.nist.gov/vuln/detail/CVE-2026-64649 |

Notes:

- CVE-2025-66478 (https://nvd.nist.gov/vuln/detail/CVE-2025-66478) was rejected as a duplicate of CVE-2025-55182. On December 4, 2025, Vercel advised rotating secrets on apps that were unpatched at that time. If the app ran an affected version then, tell the user.
- December 2025 follow-ups to CVE-2025-55182 have no version data in the research notes. Check them on NVD: CVE-2025-55184 (denial of service, https://nvd.nist.gov/vuln/detail/CVE-2025-55184), CVE-2025-55183 (Server Action source exposure, https://nvd.nist.gov/vuln/detail/CVE-2025-55183) and CVE-2025-67779 (incomplete denial-of-service fix, https://nvd.nist.gov/vuln/detail/CVE-2025-67779). The safe floor covers them.

## How to compare

1. Read the exact installed version from the lockfile, not the range in `package.json`.
2. Find its line (for example 15.5.x).
3. For each row, the version is affected when it is older than the patched release for its line and the row's conditions apply (for example, self-hosted, App Router, a custom server).
4. Report each affected row with its NVD link. Then report whether the version is below the safe floor.
5. The fix is an upgrade with the project's package manager, for example `npm install next@16.4.1`, `pnpm add next@16.4.1` or `yarn add next@16.4.1`. Pick the latest patch on the line the app already uses unless the user wants a major upgrade.
