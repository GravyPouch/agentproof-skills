# Recording findings

Write one Markdown file per Proven or Likely finding in `security-findings/` at the project root, plus `security-findings/index.md`. The sections follow AgentProof's case-file format: what was sent, what came back, the fix, and the result when it was tried again.

## File name and ID

`security-findings/NEXT-<nnn>-<short-slug>.md`, numbered in the order you find them, for example `security-findings/NEXT-002-server-action-no-auth.md`.

## Template

````markdown
# NEXT-002: Any visitor can delete any project through a Server Action

- Label: Proven | Likely
- Severity: Critical | High | Medium | Low
- Location: app/actions.ts:12 (`deleteProject`)
- Checked by: nextjs-security-audit
- Date: YYYY-MM-DD

## Claim

One plain sentence: who can do what they should not. Example: "A signed-out visitor can delete another user's project by calling the deleteProject Server Action."

## Evidence

SENT: what the test did, for example `deleteProject("project-of-a")` as user B.
CAME BACK: what happened, for example "resolved; project-of-a was deleted".

Include the code lines that cause it. Redact secrets to the first 4 characters and their location.

## Reproduction

- Test: `tests/security/NEXT-002-delete-project-action.test.ts`
- Command: `npx vitest run tests/security/NEXT-002-delete-project-action.test.ts`
- Result before the fix: 2 failed, 1 passed. (For Likely: "Not run: <reason>. Run the command above after <step>.")

## Fix

```diff
 export async function deleteProject(id: string) {
+  const session = await getSession();
+  if (!session) throw new Error("Unauthorized");
-  await db.projects.delete({ where: { id } });
+  await db.projects.delete({ where: { id, ownerId: session.userId } });
 }
```

## Retest

TRIED AGAIN: the same command.
Result after the fix: 3 passed. (For Likely: "Not run".)

## Follow-up

Anything the user must do that code cannot, such as rotating a leaked key. Leave out the section when there is nothing.
````

## Severity

- **Critical:** anonymous access to other users' data or actions, remote code execution, or an exposed secret that grants admin or database access.
- **High:** a signed-in user can read or change another user's data, or a known CVE with a working path in this app.
- **Medium:** a weakness that needs another flaw or user interaction, such as an open redirect, missing CSP or missing CSRF protection.
- **Low:** hardening gaps with little direct impact.

## index.md

```markdown
# Security findings

Audit by nextjs-security-audit on YYYY-MM-DD. Next.js <version> (<lockfile>).

| ID | Finding | Label | Severity | Fixed | Test |
| --- | --- | --- | --- | --- | --- |
| NEXT-001 | Admin users route relies on middleware only | Likely | High | Yes | tests/security/NEXT-001-admin-users-route.test.ts |

## Ruled out

- Open redirects: the only redirect uses a fixed path (app/login/actions.ts:20).
```
