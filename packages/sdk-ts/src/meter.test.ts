import test from "node:test";
import assert from "node:assert/strict";
import { priceCall } from "./meter.js";

test("free pricing returns 0", () => {
  assert.equal(priceCall({ type: "free" }), 0);
});

test("per_call returns flat amount", () => {
  assert.equal(priceCall({ type: "per_call", amountUsd: 0.05 }), 0.05);
});

test("per_token scales with tokens", () => {
  assert.equal(priceCall({ type: "per_token", amountUsdPer1k: 2 }, 500), 1);
  assert.equal(priceCall({ type: "per_token", amountUsdPer1k: 2 }, 0), 0);
});

test("monthly_unlimited returns 0 per call", () => {
  assert.equal(priceCall({ type: "monthly_unlimited", amountUsdPerMonth: 10 }), 0);
});

test("missing pricing returns 0", () => {
  assert.equal(priceCall(undefined), 0);
});
