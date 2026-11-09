# Next.js checks in detail

Run these from the project root. `rg` is ripgrep; use `grep -rn` if it is not installed. Read every match; a pattern only finds candidates.

## Map the app

```sh
ls middleware.* proxy.* src/middleware.* src/proxy.* 2>/dev/null
rg -l --glob '**/route.{ts,js,tsx,jsx}' '' app src/app 2>/dev/null
rg -l --glob 'pages/api/**' '' . 2>/dev/null
rg -ln "^['\"]use server['\"]" --glob '!node_modules'
rg -n "['\"]use server['\"]" --glob '!node_modules'      # inline actions too
rg -ln "^['\"]use client['\"]" --glob '!node_modules'
rg -n "getServerSession|auth\(\)|getSession|currentUser|getUser\(|cookies\(\)" --glob '!node_modules'
```

Write down the auth helper the app uses (for example `auth()` from Auth.js, `getServerSession`, `currentUser()` from Clerk, `supabase.auth.getUser()`, or a custom `getSession()` that reads a cookie).

## 1. Auth only in middleware

1. Read the `matcher` in `middleware.ts` or `proxy.ts`. List the paths it protects.
2. For every route handler, Server Action and page under those paths, check that the handler itself calls the auth helper before it reads or writes data.
3. A handler that relies on middleware alone is a finding. So is a path the matcher misses (for example `/api/admin` protected but `/api/admin-export` not, or a matcher with a trailing-slash or case gap).
4. If the Next.js version is affected by CVE-2025-29927 or the May 2026 middleware or proxy bypasses in [cves.md](cves.md), the severity goes up: the middleware check can be skipped entirely.

Safe pattern:

```ts
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });
  // ...
}
```

## 2. Server Action authorization

Every exported function in a `'use server'` file, and every inline `'use server'` function passed to a form, can be called with a direct POST by anyone who has the action ID, which is in the page's JavaScript. For each action check:

- it calls the auth helper and refuses an anonymous caller;
- it checks that the caller owns or may change the record, for example `where: { id, ownerId: session.userId }`, not `where: { id }`;
- it does not take the user ID, role or tenant from its arguments.

Unused exported actions are still endpoints. Remove them or protect them.

## 3. Server Action input

- Validate arguments with a schema (`zod`, `valibot` or what the app uses). `FormData` values are strings or files, never trusted types.
- Bound lengths and array sizes.
- Do not spread client objects into database writes (`data: { ...input }`), which lets the client set fields such as `role` or `ownerId`.

## 4. `NEXT_PUBLIC_` secrets

```sh
rg -n "NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|TOKEN|PASSWORD|PASS|SERVICE|ADMIN|DATABASE|DB_|KEY)" --glob '!node_modules' .
ls -a | rg '^\.env'
git ls-files | rg '(^|/)\.env' 
```

- `NEXT_PUBLIC_` values are inlined into client JavaScript at build time. Anyone can read them.
- Judge each key by what it is. Publishable keys are made to be public (for example a Stripe `pk_` key, a Supabase anon or publishable key, a Firebase web `apiKey`). Secret keys are not (a Stripe `sk_` or `rk_` key, a Supabase `service_role` or `sb_secret_` key, admin tokens, database URLs, signing secrets).
- A secret in a committed `.env` file is a finding even without `NEXT_PUBLIC_`.
- Also look for server-only variables read in `'use client'` files. Next.js replaces them with `undefined` in the browser, which often hides a bug where the developer then renamed the variable to `NEXT_PUBLIC_`.

## 5. Server to Client data

- Find Server Components that render a `'use client'` component and pass props. Check what the props contain. A full user record with `passwordHash`, `resetToken`, `apiKey`, email addresses of other users or internal flags is a finding.
- Modules that read secrets or talk to the database should start with `import 'server-only'`, so importing them from client code fails the build.
- The taint APIs (`experimental.taint`) can mark objects that must not reach the client; suggest them where the app already uses them.

## 6. `next.config`

Read `next.config.js`, `next.config.mjs` or `next.config.ts`.

- `headers()`: look for `Content-Security-Policy`, `frame-ancestors` or `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` and `Referrer-Policy`. Headers may also be set in middleware or by the host; check there before you report them missing.
- `images.remotePatterns` with `hostname: '**'`, `hostname: '*.com'` or a missing `pathname` lets the image optimizer fetch from any host. `images.domains` is the older form. `dangerouslyAllowSVG: true` needs a `contentSecurityPolicy` for images.
- `experimental.serverActions.allowedOrigins` widens the Server Actions `Origin` check. Each entry must be a host the user controls.

## 7. Open redirects

```sh
rg -n "redirect\(|NextResponse\.redirect|router\.(push|replace)\(|location\.(href|assign)" --glob '!node_modules'
rg -n "searchParams\.get\(['\"](next|redirect|returnTo|callbackUrl|url|to)['\"]\)" --glob '!node_modules'
```

A redirect target taken from the request is a finding unless the code allows only relative paths:

```ts
function safePath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}
```

## 8. Draft mode and revalidation

```sh
rg -n "draftMode\(\)|revalidatePath|revalidateTag|res\.revalidate" --glob '!node_modules'
```

Each route that enables draft mode or revalidates must check a secret from a server-only variable, compare it in constant time (`crypto.timingSafeEqual`), and refuse a missing secret. A secret in `NEXT_PUBLIC_`, in the client bundle, or compared with `==` against an empty default is a finding.

## 9. Route handler CSRF

Route Handlers and Pages API routes have no built-in CSRF protection. For each state-changing handler that authenticates with cookies, check for one of: an `Origin` or `Sec-Fetch-Site` check, `SameSite=Lax` or `Strict` session cookies plus no state change on GET, or a CSRF token. Handlers authenticated only with an `Authorization` header are not affected.
