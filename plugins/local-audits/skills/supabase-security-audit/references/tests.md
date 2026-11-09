# Supabase security test templates

These tests run with `supabase-js` against the local stack only. Use the project's runner if it has one; the templates use `node:test` and need only `@supabase/supabase-js`. Read the URL and keys from `supabase status -o env` into the test environment:

```sh
supabase start
eval "$(supabase status -o env)"     # sets API_URL, ANON_KEY, SERVICE_ROLE_KEY and others
node --test tests/security/
```

Variable names from `supabase status -o env` can differ between CLI versions; check its output and adjust. The setup refuses to run unless the URL is local, so the `service_role` key can never be used against a hosted project.

Name each test after the finding ID.

## Setup: anon, user A and user B

```js
// tests/security/supabase-users.mjs
import { createClient } from "@supabase/supabase-js";

export const url = process.env.API_URL ?? process.env.SUPABASE_URL;
const anonKey = process.env.ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url ?? "")) {
  throw new Error("Security tests run only against the local Supabase stack");
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
export const anon = () => createClient(url, anonKey, options);
const admin = createClient(url, serviceKey, options);

export async function makeUser(label) {
  const email = `${label}-${Date.now()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

export async function deleteUser(user) {
  await admin.auth.admin.deleteUser(user.id);
}
```

## Table: anon, user A, user B

```js
// tests/security/SUPA-001-notes-rls.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { anon, makeUser, deleteUser } from "./supabase-users.mjs";

let a, b, noteOfA;

before(async () => {
  a = await makeUser("user-a");
  b = await makeUser("user-b");
  const { data, error } = await a.client.from("notes").insert({ user_id: a.id, body: "private note of A" }).select().single();
  assert.ifError(error);
  noteOfA = data;
});

after(async () => { await deleteUser(a); await deleteUser(b); });

test("SUPA-001 anon cannot read notes", async () => {
  const { data } = await anon().from("notes").select("*");
  assert.deepEqual(data ?? [], []);
});

test("SUPA-001 user B cannot read user A's notes", async () => {
  const { data } = await b.client.from("notes").select("*").eq("id", noteOfA.id);
  assert.deepEqual(data ?? [], []);
});

test("SUPA-001 user B cannot change user A's note", async () => {
  const { data } = await b.client.from("notes").update({ body: "changed" }).eq("id", noteOfA.id).select();
  assert.deepEqual(data ?? [], []);
  const { data: check } = await a.client.from("notes").select("body").eq("id", noteOfA.id).single();
  assert.equal(check.body, "private note of A");
});

test("SUPA-001 user B cannot insert a note owned by user A", async () => {
  const { error } = await b.client.from("notes").insert({ user_id: a.id, body: "forged" });
  assert.ok(error, "insert should be refused");
});

test("SUPA-001 user A can read their own note", async () => {
  const { data } = await a.client.from("notes").select("*").eq("id", noteOfA.id);
  assert.equal(data.length, 1);
});
```

RLS hides rows rather than raising errors on `SELECT`, `UPDATE` and `DELETE`, so assert on the returned rows and on the data afterwards. Refused inserts return an error with code `42501`.

## Storage

```js
// tests/security/SUPA-003-avatars-bucket.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { anon, makeUser, deleteUser } from "./supabase-users.mjs";

let a, b;
const file = new Blob(["test"], { type: "text/plain" });
before(async () => { a = await makeUser("user-a"); b = await makeUser("user-b"); });
after(async () => { await deleteUser(a); await deleteUser(b); });

test("SUPA-003 anon cannot upload", async () => {
  const { error } = await anon().storage.from("avatars").upload(`anon-${Date.now()}.txt`, file);
  assert.ok(error, "anonymous upload should be refused");
});

test("SUPA-003 user B cannot write into user A's folder", async () => {
  const { error } = await b.client.storage.from("avatars").upload(`${a.id}/avatar.txt`, file, { upsert: true });
  assert.ok(error, "upload into another user's folder should be refused");
});

test("SUPA-003 user A can upload into their own folder", async () => {
  const { error } = await a.client.storage.from("avatars").upload(`${a.id}/avatar.txt`, file, { upsert: true });
  assert.ifError(error);
});
```

For a bucket that must be private, also assert that `storage.from(bucket).getPublicUrl(path)` returns 400 or 404 when fetched from the local API.

## RPC

```js
test("SUPA-004 anon cannot call get_all_notes", async () => {
  const { data, error } = await anon().rpc("get_all_notes");
  assert.ok(error || (data ?? []).length === 0);
});
```

## Keys in client code

```js
// tests/security/SUPA-002-no-service-key-in-client.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const clientDirs = ["src", "app", "components", "lib", "dist", "build", ".next/static"].filter(existsSync);
const pattern = /service_role|SERVICE_ROLE|sb_secret_/;

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === "node_modules") return [];
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("SUPA-002 no service role or secret key in client code", () => {
  const hits = [];
  for (const dir of clientDirs) {
    for (const file of files(dir)) {
      if (!/\.(js|jsx|ts|tsx|mjs|svelte|vue)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (text.includes("'use server'") || text.includes('"use server"')) continue;
      if (pattern.test(text)) hits.push(file);
    }
  }
  assert.deepEqual(hits, []);
});

test("SUPA-002 no client-exposed variable holds a secret key", () => {
  const env = [".env", ".env.local", ".env.production"].filter(existsSync).map(f => readFileSync(f, "utf8")).join("\n");
  const exposed = env.split("\n").filter(l => /^(NEXT_PUBLIC|VITE|EXPO_PUBLIC|PUBLIC|REACT_APP)_[A-Z_]*(SERVICE|SECRET)/.test(l));
  assert.deepEqual(exposed.map(l => l.split("=")[0]), []);
});
```

Adjust `clientDirs` to the folders that ship to the browser. Server-only folders (API routes, Edge Functions) may hold the key legitimately; exclude them.
