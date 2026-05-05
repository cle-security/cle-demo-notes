import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./index.js";

test("health check responds ok", async () => {
  const app = await buildApp();
  try {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
  } finally {
    await app.close();
  }
});

test("unauthenticated /api/notes returns 401", async () => {
  const app = await buildApp();
  try {
    const res = await app.inject({ method: "GET", url: "/api/notes" });
    assert.equal(res.statusCode, 401);
  } finally {
    await app.close();
  }
});
