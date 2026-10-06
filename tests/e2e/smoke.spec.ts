import { expect, test } from "@playwright/test";

test("the page loads with the wordmark", async ({ page }, info) => {
  await page.goto("/");
  await expect(page).toHaveTitle("notes");
  await expect(page.locator(".wordmark")).toHaveText("notes");
  await page.screenshot({ path: info.outputPath("front.png"), fullPage: true });
});

test("health answers ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("unknown api routes answer 404 as json", async ({ request }) => {
  const res = await request.get("/api/nothing");
  expect(res.status()).toBe(404);
  expect(await res.json()).toEqual({ error: "not found" });
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
});
