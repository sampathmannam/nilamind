// P19.2 — Per-contact caregiver share preferences & auto-alert thresholds.
// On-device only; user controls exactly what each caregiver sees.

import { secureLocal } from "./secureLocal";

export interface CaregiverPreferences {
  shareCategories: {
    mood: boolean;
    phase: boolean;
    sleep: boolean;
    medication: boolean;
    wellbeing: boolean;
    checkins: boolean;
  };
  autoAlert: {
    enabled: boolean;
    thresholdDays: number;
    minIntensity: number;
  };
  lastSharedAt?: string;
}

const CATEGORIES = ["mood", "phase", "sleep", "medication", "wellbeing", "checkins"] as const;

export const DEFAULT_PREFERENCES: CaregiverPreferences = Object.freeze({
  shareCategories: { mood: false, phase: true, sleep: false, medication: false, wellbeing: true, checkins: false },
  autoAlert: { enabled: false, thresholdDays: 3, minIntensity: 7 },
});

const KEY = "nilamind_caregiver_prefs";

function loadMap(): Record<string, CaregiverPreferences> {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CaregiverPreferences>;
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, CaregiverPreferences>): void {
  secureLocal.setItem(KEY, JSON.stringify(map));
}

function validatePreferences(p: CaregiverPreferences): void {
  const cats = Object.keys(p.shareCategories ?? {});
  if (cats.length !== CATEGORIES.length || !CATEGORIES.every((c) => c in (p.shareCategories ?? {}))) {
    throw new Error("shareCategories must include all 6 keys: " + CATEGORIES.join(", "));
  }
  if (p.autoAlert?.enabled && (p.autoAlert.thresholdDays ?? 0) < 1) {
    throw new Error("thresholdDays must be >= 1 when autoAlert is enabled");
  }
}

export function getCaregiverPreferences(contactId: string): CaregiverPreferences {
  const map = loadMap();
  return map[contactId] ?? { ...DEFAULT_PREFERENCES };
}

export function setCaregiverPreferences(contactId: string, prefs: CaregiverPreferences): void {
  validatePreferences(prefs);
  const map = loadMap();
  map[contactId] = prefs;
  saveMap(map);
}
