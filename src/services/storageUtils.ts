export function ls(): Storage | null {
  try {
    return (globalThis as any).localStorage ?? null;
  } catch {
    return null;
  }
}

export const DAY_MS = 86400000;

/** YYYY-MM-DD key for the LOCAL calendar day of `d` (default: now).
 *
 *  Always use this — never `toISOString().split("T")[0]` — for day-bucketing user data. toISOString
 *  is UTC: in IST (+05:30) the "day" would roll over at 05:30 local, stamping late-night diary/check-in
 *  entries with yesterday's date, and a local-midnight Date would even format as the PREVIOUS day.
 *  (2026-07-17 tester pass; EMA entries were already local via emaDateKey — this unifies the rest.) */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
