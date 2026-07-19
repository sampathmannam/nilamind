import { test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Full-scale audit: a11y per tab + every Tools tile → the screen title it opens (catches label↔destination
// mismatches like Diary→Journal, at scale). Informational — logs findings; does not hard-fail.

async function boot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("nilamind_age_confirmed", "1");
    localStorage.setItem("nilamind_onboarding_done", "1");
  });
  await page.goto("/");
  await page.waitForTimeout(2500);
}

async function closeAnyOverlay(page: Page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
  const close = page.getByRole("button", { name: /close/i }).first();
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
  await page.waitForTimeout(300);
}

const TABS = ["Nila", "Today", "Tools", "You"];

test("AUDIT: accessibility per tab", async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  for (const tab of TABS) {
    await page.getByText(tab, { exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(1200);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const ser = r.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    console.log(`\n[A11Y] ${tab}: ${r.violations.length} total | ${ser.length} serious/critical`);
    for (const v of ser) {
      console.log(`   [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
      for (const n of v.nodes.slice(0, 3)) console.log(`      @ ${n.target.join(" ")}`);
    }
  }
});

const TILES = [
  "Grounding & breathing", "Wind down for sleep", "Ambient sounds", "Reach out to someone",
  "I'm in an episode", "Quick check-in", "Diary", "DBT diary card", "Medications",
  "Problem-solving", "Values work", "Screenings", "Social rhythm", "Exposure hierarchy",
  "Relapse prevention plan", "Phone patterns",
];

test("AUDIT: Tools tile → opened screen title", async ({ page }) => {
  test.setTimeout(300_000);
  console.log("\n=== TILE → TITLE (flag if tile label & screen heading share no word) ===");
  for (const tile of TILES) {
    // Fresh boot per tile — bulletproof, no dependency on closing the previous sheet.
    await boot(page);
    let title = "(unreached)";
    let flag = "ERR";
    try {
      await page.getByText("Tools", { exact: true }).first().click({ timeout: 8000 });
      await page.waitForTimeout(400);
      // Type the label into the search box — this reveals EVERY group, incl. the "Skills & practice"
      // set hidden behind the "Show more" expander (more:true). Without this, 6 tiles are unreachable.
      await page.getByRole("textbox", { name: "Search tools" }).fill(tile);
      await page.waitForTimeout(400);
      const el = page.getByText(tile, { exact: true }).first();
      await el.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
      await el.click({ timeout: 8000 });
      await page.waitForTimeout(900);
      // Capture the OPENED sheet's title: the Sheet sets aria-label on its role="dialog". Fall back to the
      // last heading (screens rendered without the Sheet wrapper) — never headings[0] (that's the bg tab).
      const dialog = page.getByRole("dialog").last();
      title =
        (await dialog.getAttribute("aria-label").catch(() => null)) ||
        (await dialog.getByRole("heading").first().innerText().catch(() => null)) ||
        (await page.getByRole("heading").last().innerText().catch(() => "(no heading)"));
      title = (title ?? "(no heading)").trim();
      const words = tile.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
      const share = words.some((w) => title.toLowerCase().includes(w));
      flag = title === "(no heading)" ? "NO-TITLE" : share ? "ok" : "MISMATCH?";
    } catch (e) {
      flag = "NOT-CLICKABLE";
    }
    console.log(`  ${flag.padEnd(13)} "${tile}"  →  "${title}"`); // log per-row so partial results survive
  }
});
