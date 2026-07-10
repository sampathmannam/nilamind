// EMA preferences — opted in by default (EMA is low-friction and high-value).

import { ls } from "./storageUtils";

const ENABLED_KEY = "nilamind_ema_enabled";
const FREQ_KEY = "nilamind_ema_freq";

export function getEmaEnabled(): boolean {
  try {
    const store = ls();
    if (!store) return false;
    const val = store.getItem(ENABLED_KEY);
    return val === null ? false : val === "true";
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
