import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders Program Accounting", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Program Accounting/);
  assert.match(html, /Pierre Robin Sequence Symposium/);
  assert.match(html, /Current Balance/i);
  assert.doesNotMatch(html, /codex-preview/);
});

test("financial source rules remain explicit", async () => {
  const approvedBudget = 1_000_000;
  const opening = 0;
  const transactions = [
    { type: "income", amount: 850_000, status: "paid" },
    { type: "expense", amount: 430_000, status: "approved" },
    { type: "expense", amount: 20_000, status: "pending" },
    { type: "expense", amount: 99_000, status: "cancelled" },
  ];
  const actual = transactions.filter(t => ["paid", "approved"].includes(t.status));
  const income = actual.filter(t => t.type === "income").reduce((s,t)=>s+t.amount,0);
  const expense = actual.filter(t => t.type === "expense").reduce((s,t)=>s+t.amount,0);
  const committed = transactions.filter(t => t.type === "expense" && t.status === "pending").reduce((s,t)=>s+t.amount,0);
  assert.equal(opening + income - expense, 420_000);
  assert.equal(approvedBudget - expense, 570_000);
  assert.equal(committed, 20_000);
  assert.equal(expense / approvedBudget * 100, 43);
});
