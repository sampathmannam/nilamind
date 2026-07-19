import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function boot(page: Page) {
  // Clear both first-run gates (plain localStorage flags) so we land on the real tabbed UI.
  await page.addInitScript(() => {
    localStorage.setItem("nilamind_age_confirmed", "1"); // 18+ age gate
    localStorage.setItem("nilamind_onboarding_done", "1"); // first-run onboarding
  });
  await page.goto("/");
  await page.waitForTimeout(2500); // let the shell render + Capacitor plugins settle to web fallbacks
}

test("a11y: app shell has no serious/critical WCAG 2 A/AA violations", async ({ page }) => {
  await boot(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  console.log(`axe: ${results.violations.length} total, ${serious.length} serious/critical`);
  for (const v of serious) console.log(`  [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
  expect(serious.map((v) => v.id), serious.map((v) => v.id).join(", ")).toEqual([]);
});

test("Tools: 'Diary' tile must not open a screen titled 'Journal' (label↔destination)", async ({ page }) => {
  await boot(page);
  await page.getByText("Tools", { exact: true }).first().click();
  await page.getByText("Diary", { exact: true }).first().click();
  await page.waitForTimeout(800);
  // The opened sheet's <h2> header reads "Journal" today — the mismatch. This asserts it should NOT.
  await expect(page.getByRole("heading", { name: "Journal" })).toHaveCount(0);
});
