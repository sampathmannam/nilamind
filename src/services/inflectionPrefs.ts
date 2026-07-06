// Phase 2 inflection surfacing opt-in. OFF by default (privacy-first; detection + log run regardless —
// this only gates whether Nila SAYS something). Plain localStorage (non-sensitive UI pref).
import { ls } from "./storageUtils";

const KEY = "nilamind_inflection_enabled";
export function getInflectionEnabled(): boolean { try { return ls()?.getItem(KEY) === "1"; } catch { return false; } }
export function setInflectionEnabled(v: boolean): void { try { ls()?.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ } }
