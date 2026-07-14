// P19.6 — Caregiver auto-alert threshold checker.
// Checks if any caregiver contact has autoAlert enabled and the user's recent checkins
// meet the distress threshold. Returns a nudge signal — never auto-sends.
// On-device only.

import { secureLocal } from "./secureLocal";
import type { CheckInEntry } from "../types";
import type { CaregiverContact } from "./caregiverContacts";
import type { CaregiverPreferences } from "./caregiverPreferences";

export interface CaregiverAlertResult {
  shouldAlert: boolean;
  contactIds: string[];
  reason: string;
}

function loadCheckins(): CheckInEntry[] {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function loadContacts(): CaregiverContact[] {
  try {
    const raw = secureLocal.getItem("nilamind_caregiver_contacts");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function loadPrefs(): Record<string, CaregiverPreferences> {
  try {
    const raw = secureLocal.getItem("nilamind_caregiver_prefs");
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CaregiverPreferences>;
  } catch { return {}; }
}

export function checkCaregiverAlerts(): CaregiverAlertResult {
  const contacts = loadContacts();
  if (contacts.length === 0) return { shouldAlert: false, contactIds: [], reason: "" };

  const prefs = loadPrefs();
  const checkins = loadCheckins();
  const sorted = [...checkins]
    .filter((c) => c.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const alerting: string[] = [];

  for (const c of contacts) {
    const p = prefs[c.id];
    if (!p?.autoAlert?.enabled) continue;

    const td = p.autoAlert.thresholdDays > 0 ? p.autoAlert.thresholdDays : 3;
    const mi = p.autoAlert.minIntensity >= 1 && p.autoAlert.minIntensity <= 10 ? p.autoAlert.minIntensity : 7;

    const recent = sorted.slice(-td);
    if (recent.length < td) continue;

    // Verify consecutive calendar days.
    let consecutive = true;
    for (let i = 1; i < recent.length; i++) {
      const prev = new Date(recent[i - 1].date);
      const curr = new Date(recent[i].date);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (Math.abs(diffDays - 1) > 0.5) { consecutive = false; break; }
    }
    if (!consecutive) continue;

    const allAbove = recent.every((e) => typeof e.intensity === "number" && e.intensity >= mi);
    if (allAbove) alerting.push(c.id);
  }

  return {
    shouldAlert: alerting.length > 0,
    contactIds: alerting,
    reason: alerting.length > 0 ? `Distress has been high for ${alerting.length > 1 ? "multiple" : "a"} caregiver contact${alerting.length > 1 ? "s" : ""}.` : "",
  };
}
