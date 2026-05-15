import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// API-secret hashing. We use scrypt from node:crypto (zero deps, memory-hard,
// gold-standard for high-entropy secrets). Format:
//
//   "scrypt$N$r$p$<base64salt>$<base64hash>"
//
// Defaults: N=2^15 (32768), r=8, p=1. Adjust upward if servers can handle the
// CPU cost — this is fine for verifying a few times per second per project.

const N = 32768;
const r = 8;
const p = 1;
const KEY_LEN = 32;
const MAXMEM = 64 * 1024 * 1024; // 64 MB — Node default is 32 MB which is too tight for N=32768

export function hashApiSecret(secret: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, KEY_LEN, { N, r, p, maxmem: MAXMEM });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyApiSecret(secret: string, stored: string): boolean {
  // Backwards-compat: plain-text secrets from the seed data still validate via
  // string equality. Real records should always be in scrypt$... form.
  if (!stored.startsWith("scrypt$")) {
    return constantTimeEqString(secret, stored);
  }

  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(secret, salt, expected.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
    maxmem: MAXMEM,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function constantTimeEqString(a: string, b: string): boolean {
  // Pad to a common length to keep comparison time independent of input length.
  const max = Math.max(a.length, b.length);
  const ab = Buffer.alloc(max);
  const bb = Buffer.alloc(max);
  ab.write(a);
  bb.write(b);
  return a.length === b.length && timingSafeEqual(ab, bb);
}

export function generateApiSecret(): string {
  return `sk_live_${randomBytes(24).toString("base64url")}`;
}
