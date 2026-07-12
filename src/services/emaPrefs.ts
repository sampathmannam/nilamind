// EMA preferences — opted in by default (EMA is low-friction and high-value).
//
// getEmaEnabled() defaulting to true (unset key) is safe precisely because it's not the only
// gate: syncEmaCheckins() (notifications.ts) still requires OS notification permission before it
// schedules anything, and App.tsx's boot-time call passes { request: false } — it only checks an
// already-granted permission and never fires the native prompt on open. So a true default here
// changes what the Settings toggle shows by default; it does not, on its own, start sending
// notifications to anyone who hasn't already granted permission through some other route.
//
// The paired 2-3/day frequency default+cap (getEmaFrequency/setEmaFrequency below) already
// matches the literature: nonclinical EMA compliance peaks at 2-3 prompts/day (91.7%) and drops at
// higher frequency (74-75%), per Wen, Schneider, Stone & Spruijt-Metz (2017), JMIR.

import { ls } from "./storageUtils";

const ENABLED_KEY = "nilamind_ema_enabled";
const FREQ_KEY = "nilamind_ema_freq";

export function getEmaEnabled(): boolean {
  try {
    const store = ls();
    if (!store) return false;
    const val = store.getItem(ENABLED_KEY);
    return val === null ? true : val === "true";
  } catch {
    return false;
  }
}

export function setEmaEnabled(enabled: boolean): void {
  try {
    const store = ls();
    if (store) store.setItem(ENABLED_KEY, enabled ? "true" : "false");
  } catch { /* best effort */ }
}

export function getEmaFrequency(): number {
  try {
    const store = ls();
    if (!store) return 2;
    const val = store.getItem(FREQ_KEY);
    if (val === null) return 2;
    const n = parseInt(val, 10);
    return n >= 1 && n <= 3 ? n : 2;
  } catch {
    return 2;
  }
}

export function setEmaFrequency(freq: number): void {
  try {
    const store = ls();
    if (store) store.setItem(FREQ_KEY, String(Math.min(3, Math.max(1, freq))));
  } catch { /* best effort */ }
}
