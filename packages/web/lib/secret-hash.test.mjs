// Standalone test for secret-hash. Run with: node --test secret-hash.test.mjs
// We exercise it via a temporary import compiled by tsc-on-the-fly is overkill —
// instead we re-implement the public surface inline by importing from the
// transpiled output if present. For CI we'll wire this into a real harness.

import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Inline copy of the implementation under test. Keeping the test free of build
// dependencies — Next.js doesn't compile lib/ files in isolation.
const N = 32768, r = 8, p = 1, KEY_LEN = 32, MAXMEM = 64 * 1024 * 1024;

function hashApiSecret(secret) {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, KEY_LEN, { N, r, p, maxmem: MAXMEM });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyApiSecret(secret, stored) {
  if (!stored.startsWith("scrypt$")) {
    return secret === stored;
  }
  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(secret, salt, expected.length, {
    N: Number(nStr), r: Number(rStr), p: Number(pStr), maxmem: MAXMEM,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

test("hash format is scrypt$N$r$p$salt$hash", () => {
  const stored = hashApiSecret("sk_live_test");
  const parts = stored.split("$");
  assert.equal(parts[0], "scrypt");
  assert.equal(parts.length, 6);
});

test("verify accepts correct secret", () => {
  const stored = hashApiSecret("sk_live_correct");
  assert.equal(verifyApiSecret("sk_live_correct", stored), true);
});

test("verify rejects wrong secret", () => {
  const stored = hashApiSecret("sk_live_correct");
  assert.equal(verifyApiSecret("sk_live_wrong", stored), false);
});

test("verify rejects truncated hash", () => {
  const stored = hashApiSecret("x");
  const truncated = stored.split("$").slice(0, 5).join("$");
  assert.equal(verifyApiSecret("x", truncated), false);
});

test("verify falls back to plain string match for legacy entries", () => {
  assert.equal(verifyApiSecret("legacy_plain", "legacy_plain"), true);
  assert.equal(verifyApiSecret("wrong", "legacy_plain"), false);
});

test("different hashes for same secret (random salt)", () => {
  const a = hashApiSecret("same");
  const b = hashApiSecret("same");
  assert.notEqual(a, b);
  assert.equal(verifyApiSecret("same", a), true);
  assert.equal(verifyApiSecret("same", b), true);
});
