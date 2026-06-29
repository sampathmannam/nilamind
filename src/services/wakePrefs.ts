// "Hey Nila" wake-word opt-in. OFF by default (privacy-first). Plain localStorage (non-sensitive UI pref).
const KEY = "nilamind_wakeword";
const ls = (): Storage | null => { try { return (globalThis as any).localStorage ?? null; } catch { return null; } };
export function getWakeEnabled(): boolean { try { return ls()?.getItem(KEY) === "1"; } catch { return false; } }
export function setWakeEnabled(v: boolean): void { try { ls()?.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ } }
