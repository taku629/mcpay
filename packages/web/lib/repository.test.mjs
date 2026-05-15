// Repository contract tests against the in-memory implementation. Inlined to
// avoid pulling in TS compilation — the body mirrors repository.memory.ts.

import test from "node:test";
import assert from "node:assert/strict";

function makeStore() {
  return { projects: new Map(), customers: new Map(), customerKeys: new Map(), usage: [] };
}

function rand(prefix) {
  return prefix + Math.random().toString(36).slice(2, 10);
}

function makeRepo() {
  const store = makeStore();
  return {
    async createProject({ ownerId, name, apiSecretHash }) {
      const r = { id: rand("prj_"), ownerId, name, apiSecret: apiSecretHash, createdAt: new Date().toISOString() };
      store.projects.set(r.id, r);
      return r;
    },
    async getProject(id) { return store.projects.get(id) ?? null; },
    async listProjectsByOwner(ownerId) {
      return [...store.projects.values()].filter((p) => p.ownerId === ownerId);
    },
    async upsertCustomer({ email, stripeCustomerId }) {
      for (const c of store.customers.values()) {
        if (c.stripeCustomerId === stripeCustomerId) {
          c.email = email; return c;
        }
      }
      const r = { id: rand("cust_"), email, stripeCustomerId, createdAt: new Date().toISOString() };
      store.customers.set(r.id, r);
      return r;
    },
    async createCustomerKey({ apiKey, projectId, customerId, monthlyBudgetUsd }) {
      const r = { apiKey, projectId, customerId, monthlyBudgetUsd, consumedThisMonthUsd: 0, createdAt: new Date().toISOString() };
      store.customerKeys.set(apiKey, r);
      return r;
    },
    async getCustomerKey(apiKey) { return store.customerKeys.get(apiKey) ?? null; },
    async incrementConsumption(apiKey, amount) {
      const k = store.customerKeys.get(apiKey);
      if (k) k.consumedThisMonthUsd += amount;
    },
    async recordUsage(r) { store.usage.push(r); },
    async resetAllMonthlyConsumption() {
      let n = 0;
      for (const k of store.customerKeys.values()) {
        if (k.consumedThisMonthUsd > 0) { k.consumedThisMonthUsd = 0; n++; }
      }
      return n;
    },
  };
}

test("createProject persists and getProject returns it", async () => {
  const repo = makeRepo();
  const p = await repo.createProject({ ownerId: "u1", name: "x", apiSecretHash: "h" });
  const got = await repo.getProject(p.id);
  assert.deepEqual(got, p);
});

test("listProjectsByOwner filters by owner", async () => {
  const repo = makeRepo();
  await repo.createProject({ ownerId: "u1", name: "a", apiSecretHash: "h" });
  await repo.createProject({ ownerId: "u2", name: "b", apiSecretHash: "h" });
  const u1 = await repo.listProjectsByOwner("u1");
  assert.equal(u1.length, 1);
  assert.equal(u1[0].name, "a");
});

test("upsertCustomer dedupes by stripeCustomerId", async () => {
  const repo = makeRepo();
  const a = await repo.upsertCustomer({ email: "a@x", stripeCustomerId: "cus_1" });
  const b = await repo.upsertCustomer({ email: "b@x", stripeCustomerId: "cus_1" });
  assert.equal(a.id, b.id);
  assert.equal(b.email, "b@x");
});

test("incrementConsumption accumulates", async () => {
  const repo = makeRepo();
  await repo.createCustomerKey({ apiKey: "k1", projectId: "p", customerId: "c" });
  await repo.incrementConsumption("k1", 0.1);
  await repo.incrementConsumption("k1", 0.05);
  const k = await repo.getCustomerKey("k1");
  assert.equal(k.consumedThisMonthUsd.toFixed(2), "0.15");
});

test("resetAllMonthlyConsumption zeros non-zero entries and reports count", async () => {
  const repo = makeRepo();
  await repo.createCustomerKey({ apiKey: "k1", projectId: "p", customerId: "c" });
  await repo.createCustomerKey({ apiKey: "k2", projectId: "p", customerId: "c" });
  await repo.incrementConsumption("k1", 1);
  const reset = await repo.resetAllMonthlyConsumption();
  assert.equal(reset, 1);
  assert.equal((await repo.getCustomerKey("k1")).consumedThisMonthUsd, 0);
});
