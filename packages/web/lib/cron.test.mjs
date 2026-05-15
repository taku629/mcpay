// Tests cron-auth predicate. Inlined for no-build test surface.

import test from "node:test";
import assert from "node:assert/strict";

function isAuthorizedCron(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

const makeReq = (url, headers = {}) =>
  new Request(url, { headers: new Headers(headers) });

test("returns false when CRON_SECRET unset", () => {
  delete process.env.CRON_SECRET;
  assert.equal(isAuthorizedCron(makeReq("https://x.test/")), false);
});

test("accepts bearer header", () => {
  process.env.CRON_SECRET = "tophersecret";
  const req = makeReq("https://x.test/", { authorization: "Bearer tophersecret" });
  assert.equal(isAuthorizedCron(req), true);
});

test("accepts ?secret query param", () => {
  process.env.CRON_SECRET = "tophersecret";
  const req = makeReq("https://x.test/?secret=tophersecret");
  assert.equal(isAuthorizedCron(req), true);
});

test("rejects wrong secret", () => {
  process.env.CRON_SECRET = "tophersecret";
  const req = makeReq("https://x.test/", { authorization: "Bearer wrong" });
  assert.equal(isAuthorizedCron(req), false);
});

test("rejects when both missing", () => {
  process.env.CRON_SECRET = "tophersecret";
  assert.equal(isAuthorizedCron(makeReq("https://x.test/")), false);
});
