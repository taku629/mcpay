import test from "node:test";
import assert from "node:assert/strict";
import { MCPayClient } from "./client.js";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("malformed verify responses fail closed", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: "yes" }), { status: 200 });
  const client = new MCPayClient({ projectId: "p", apiSecret: "s", maxRetries: 0 });
  assert.deepEqual(await client.verifyApiKey("k"), { ok: false, reason: "verify malformed response" });
});

test("transient verify failures are retried", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return calls === 1
      ? new Response("busy", { status: 503 })
      : new Response(JSON.stringify({ ok: true, customerId: "c" }), { status: 200 });
  };
  const client = new MCPayClient({ projectId: "p", apiSecret: "s", maxRetries: 1 });
  assert.equal((await client.verifyApiKey("k")).ok, true);
  assert.equal(calls, 2);
});
