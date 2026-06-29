// Theme choice (AUTOPILOT AP6). Trauma-informed: we OFFER System / Light / Dark rather than impose
// one, because there is no universal calming palette (docs/UX_RESEARCH.md — colour psychology +
// user control). Warm-dark is the default character; light is a warm-cream alternative. The choice
// is a non-sensitive UI preference → plain localStorage (sync, safe before the secure gate).

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "nilamind_theme";

const ls = (): Storage | null => { try { return (globalThis as any).localStorage ?? null; } catch { return null; } };

export function getThemeChoice(): ThemeChoice {
  const v = ls()?.getItem(KEY);
  // Default to the Sunrise (light) look — it's the app's new primary design. Users can still pick
  // System or Dark; only an explicit saved choice overrides Sunrise.
  return v === "light" || v === "dark" || v === "system" ? v : "light";
}

function systemPrefersLight(): boolean {
  try { return !!(globalThis as any).matchMedia?.("(prefers-color-scheme: light)").matches; } catch { return false; }
}

/** Resolve the choice to an effective mode and toggle the `theme-light` class on <html>. */
export function applyTheme(choice: ThemeChoice = getThemeChoice()): "light" | "dark" {
  const light = choice === "light" || (choice === "system" && systemPrefersLight());
  try { document.documentElement.classList.toggle("theme-light", light); } catch { /* */ }
  return light ? "light" : "dark";
}

export function setThemeChoice(choice: ThemeChoice): void {
  try { ls()?.setItem(KEY, choice); } catch { /* */ }
  applyTheme(choice);
}

/** Call once at startup: apply the saved choice and keep "system" in sync with OS changes. */
export function initTheme(): void {
  applyTheme();
  try {
    const mq = (globalThis as any).matchMedia?.("(prefers-color-scheme: light)");
    mq?.addEventListener?.("change", () => { if (getThemeChoice() === "system") applyTheme(); });
  } catch { /* */ }
}
