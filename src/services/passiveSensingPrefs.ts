// Phase 24 — Passive sensing opt-in. OFF by default (privacy-first; feature extraction runs regardless —
// this only gates whether proactive surfaces show cards/nudges). Plain localStorage (non-sensitive UI pref).
import { ls } from "./storageUtils";

const KEY = "nilamind_passive_sensing_enabled";
export function getPassiveSensingEnabled(): boolean {
  try { return ls()?.getItem(KEY) === "1"; } catch { return false; }
}
export function setPassiveSensingEnabled(v: boolean): void {
  try { ls()?.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
}