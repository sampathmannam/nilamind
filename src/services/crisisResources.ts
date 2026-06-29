// Region-aware crisis resources. A global mental-health app must NOT show one country's hotline to
// everyone — a person in crisis needs a number that actually works where they are. This registry maps
// a chosen region to verified crisis lines, with an always-present International fallback so the app
// can NEVER render an empty crisis resource.
//
// Numbers here are widely-published national lines (verified as of build). The user picks their region
// (locale-guessed by default, changeable in Settings); if unknown we use the International directory.
//
// SAFETY INVARIANTS:
//  - getCrisisLines() always returns ≥1 line.
//  - The International fallback points to directories that cover every country.
//  - If you edit a number, double-check it — this is the one place wrong data can cause real harm.

export type RegionCode = "IN" | "US" | "GB" | "CA" | "AU" | "international";

export interface CrisisLine {
  name: string;
  display: string; // human-readable number / instruction
  tel?: string; // digits for a tel: link (omit for directories)
  url?: string; // for directory fallbacks
  kind: "call" | "text" | "directory";
  note?: string;
}

export interface RegionResources {
  code: RegionCode;
  label: string;
  lines: CrisisLine[];
}

const INTERNATIONAL: RegionResources = {
  code: "international",
  label: "International",
  lines: [
    { name: "Find a Helpline", display: "findahelpline.com — free lines in 130+ countries", url: "https://findahelpline.com", kind: "directory" },
    { name: "Befrienders Worldwide", display: "befrienders.org — local crisis centres worldwide", url: "https://www.befrienders.org", kind: "directory" },
    { name: "Emergency services", display: "Call your local emergency number if in immediate danger", kind: "call", note: "e.g. 112 (EU), 911 (US/CA), 999 (UK), 000 (AU), 112/108 (India)" },
  ],
};

const REGIONS: Record<RegionCode, RegionResources> = {
  IN: {
    code: "IN",
    label: "India",
    lines: [
      { name: "iCall", display: "9152987821", tel: "9152987821", kind: "call", note: "Mon–Sat, 8am–10pm" },
      { name: "Vandrevala Foundation", display: "1860-2662-345", tel: "18602662345", kind: "call", note: "24/7" },
      { name: "KIRAN (Govt. of India)", display: "1800-599-0019", tel: "18005990019", kind: "call", note: "24/7, multi-language" },
    ],
  },
  US: {
    code: "US",
    label: "United States",
    lines: [
      { name: "988 Suicide & Crisis Lifeline", display: "Call or text 988", tel: "988", kind: "call", note: "24/7" },
      { name: "Crisis Text Line", display: "Text HOME to 741741", tel: "741741", kind: "text", note: "24/7" },
    ],
  },
  GB: {
    code: "GB",
    label: "United Kingdom",
    lines: [
      { name: "Samaritans", display: "116 123", tel: "116123", kind: "call", note: "Free, 24/7" },
      { name: "SHOUT", display: "Text SHOUT to 85258", tel: "85258", kind: "text", note: "24/7" },
    ],
  },
  CA: {
    code: "CA",
    label: "Canada",
    lines: [
      { name: "9-8-8 Suicide Crisis Helpline", display: "Call or text 988", tel: "988", kind: "call", note: "24/7" },
    ],
  },
  AU: {
    code: "AU",
    label: "Australia",
    lines: [
      { name: "Lifeline", display: "13 11 14", tel: "131114", kind: "call", note: "24/7" },
      { name: "Beyond Blue", display: "1300 22 4636", tel: "1300224636", kind: "call", note: "24/7" },
    ],
  },
  international: INTERNATIONAL,
};

const STORAGE_KEY = "nilamind_region"; // non-sensitive UI/safety setting → plain localStorage (sync, pre-gate safe)

function localStorageSafe(): Storage | null {
  try { return (globalThis as any).localStorage ?? null; } catch { return null; }
}

/** Guess a region from the device locale; falls back to International. */
function guessRegion(): RegionCode {
  try {
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
    for (const l of langs) {
      const region = (l.split("-")[1] || "").toUpperCase();
      if (region in REGIONS) return region as RegionCode;
    }
  } catch { /* ignore */ }
  return "international";
}

/** Whether the user has explicitly chosen a region (vs. running on the locale guess). */
export function regionIsExplicit(): boolean {
  return !!localStorageSafe()?.getItem(STORAGE_KEY);
}

export function getRegionCode(): RegionCode {
  const stored = localStorageSafe()?.getItem(STORAGE_KEY) as RegionCode | null;
  if (stored && stored in REGIONS) return stored;
  return guessRegion();
}

export function setRegionCode(code: RegionCode): void {
  try { localStorageSafe()?.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
}

export function getRegion(): RegionResources {
  return REGIONS[getRegionCode()] ?? INTERNATIONAL;
}

export function allRegions(): RegionResources[] {
  return [REGIONS.IN, REGIONS.US, REGIONS.GB, REGIONS.CA, REGIONS.AU, INTERNATIONAL];
}

/** Always ≥1 line. */
export function getCrisisLines(): CrisisLine[] {
  const r = getRegion();
  return r.lines.length ? r.lines : INTERNATIONAL.lines;
}

/** Compact one-line string for prompts / plain-text replies, e.g. "iCall: 9152987821 | Vandrevala: 1860-2662-345". */
export function crisisLinesInline(): string {
  return getCrisisLines()
    .map((l) => (l.tel || l.kind !== "directory" ? `${l.name}: ${l.display}` : `${l.name} (${l.display})`))
    .join(" | ");
}

/** Digit strings of the current region's callable lines — used by the safety guard to confirm an AI
 *  reply actually surfaced a crisis resource. */
export function crisisDigits(): string[] {
  return getCrisisLines().map((l) => l.tel).filter((t): t is string => !!t);
}
