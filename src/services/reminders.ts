// Reminder / quiet-hours preferences (AUTOPILOT Phase 5 — settings + helpers).
// The actual local-notification SCHEDULING that reads these prefs lands in Phase 7; here we just
// store the user's chosen reminder window + quiet hours and expose a quiet-hours check.
// Non-sensitive UI prefs → plain localStorage (sync, pre-gate safe).

const KEY = "nilamind_reminders";

export interface ReminderPrefs {
  enabled: boolean;
  windowStart: string; // "HH:MM" — earliest a nudge may fire
  windowEnd: string; // "HH:MM" — latest
  quietStart: string; // "HH:MM" — quiet hours begin (no nudges)
  quietEnd: string; // "HH:MM" — quiet hours end
}
const DEFAULTS: ReminderPrefs = { enabled: false, windowStart: "10:00", windowEnd: "20:00", quietStart: "22:00", quietEnd: "08:00" };

const ls = (): Storage | null => { try { return (globalThis as any).localStorage ?? null; } catch { return null; } };

export function getReminderPrefs(): ReminderPrefs {
  try { const raw = ls()?.getItem(KEY); return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS; } catch { return DEFAULTS; }
}
export function setReminderPrefs(p: Partial<ReminderPrefs>): void {
  const next = { ...getReminderPrefs(), ...p };
  try { ls()?.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

const toMin = (hhmm: string): number => { const [h, m] = hhmm.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

/** True if `at` falls inside the configured quiet hours (handles overnight ranges like 22:00–08:00). */
export function withinQuietHours(at: Date = new Date()): boolean {
  const { quietStart, quietEnd } = getReminderPrefs();
  const now = at.getHours() * 60 + at.getMinutes();
  const s = toMin(quietStart), e = toMin(quietEnd);
  return s <= e ? now >= s && now < e : now >= s || now < e; // overnight wrap
}
