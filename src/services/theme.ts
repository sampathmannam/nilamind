// Theme choice (AUTOPILOT AP6). Trauma-informed: we OFFER System / Light / Dark rather than impose
// one, because there is no universal calming palette (docs/UX_RESEARCH.md — colour psychology +
// user control). Warm-dark is the default character; light is a warm-cream alternative. The choice
// is a non-sensitive UI preference → plain localStorage (sync, safe before the secure gate).

import { ls } from "./storageUtils";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "nilamind_theme";

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
  // Sync the NATIVE status bar to the app's (JS-controlled) theme so its icons stay legible: dark icons on
  // the light/cream theme, light icons on dark. The Android theme is DayNight (follows the SYSTEM), so the
  // status bar would otherwise mismatch the app's own choice (light icons on cream = unreadable). Native-only,
  // best-effort — a no-op on web / if the plugin isn't present.
  void (async () => {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      // Capacitor's Style naming is inverted: Style.Light = DARK icons (for light bgs), Style.Dark = LIGHT
      // icons (for dark bgs). So light theme → Style.Light (dark icons on cream), dark theme → Style.Dark.
      await StatusBar.setStyle({ style: light ? Style.Light : Style.Dark });
    } catch { /* web or plugin unavailable */ }
  })();
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
