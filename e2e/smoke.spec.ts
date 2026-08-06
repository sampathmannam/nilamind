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
  for (const v of serious) {
    console.log(`  [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
    for (const n of v.nodes.slice(0, 5)) console.log(`      @ ${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`);
  }
  expect(serious.map((v) => v.id), serious.map((v) => v.id).join(", ")).toEqual([]);
});

test("Tools: 'Journal' tile opens the Journal screen (label↔destination match)", async ({ page }) => {
  // Regression guard for the fixed Diary→Journal mismatch: the tile is now labelled "Journal"
  // (i18n tool_diary_label) and must open the screen whose aux title is "Journal" (App.tsx AUX_LABELS).
  await boot(page);
  await page.getByText("Tools", { exact: true }).first().click();
  await page.getByText("Journal", { exact: true }).first().click();
  await page.waitForTimeout(800);
  const dialog = page.getByRole("dialog").last();
  await expect(dialog).toHaveAttribute("aria-label", /journal/i);
  // And the old "Diary" tile label must be gone (English locale).
  await expect(page.getByText("Diary", { exact: true })).toHaveCount(0);
});
