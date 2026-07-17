import { localDateKey } from "./storageUtils";
import { secureLocal, appendToSecureArray } from "./secureLocal";

const MEDS_KEY = "nilamind_medications";
const LOGS_KEY = "nilamind_med_logs";

export interface Medication {
  id: string;
  name: string;
  dose: string;
  time: string; // HH:MM
  schedule: "daily" | "twice_daily" | "weekly" | "as_needed";
  active: boolean;
}

export interface MedicationLog {
  id: string;
  medId: string;
  date: string; // YYYY-MM-DD
  taken: boolean;
  takenAt: string;
  sideEffects: SideEffectEntry[];
}

export interface SideEffectEntry {
  symptom: string;
  severity: number; // 1-10
  bother: number; // 1-10
}

export function createMedication(name: string, dose: string, time: string, schedule: Medication["schedule"]): Medication {
  return { id: "med_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), name, dose, time, schedule, active: true };
}

export function loadMedications(): Medication[] {
  try {
    const raw = secureLocal.getItem(MEDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMedications(meds: Medication[]): void {
  secureLocal.setItem(MEDS_KEY, JSON.stringify(meds));
}

export function logMedication(medId: string, taken: boolean, sideEffects: SideEffectEntry[]): MedicationLog {
  const log: MedicationLog = {
    id: "mlog_" + Date.now(),
    medId,
    date: localDateKey(),
    taken,
    takenAt: taken ? new Date().toLocaleTimeString() : "",
    sideEffects,
  };
  appendToSecureArray(LOGS_KEY, log);
  return log;
}

export function loadMedicationLogs(): MedicationLog[] {
  try {
    const raw = secureLocal.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function adherenceRate(medId: string, days = 7): number {
  const logs = loadMedicationLogs().filter((l) => l.medId === medId);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const recent = logs.filter((l) => new Date(l.date).getTime() >= since.getTime());
  if (recent.length === 0) return 0;
  return Math.round((recent.filter((l) => l.taken).length / recent.length) * 100);
}

export function commonSideEffects(medId: string, days = 14): { symptom: string; count: number; avgSeverity: number }[] {
  const logs = loadMedicationLogs().filter((l) => l.medId === medId);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const recent = logs.filter((l) => new Date(l.date).getTime() >= since.getTime());
  const tally = new Map<string, { count: number; totalSeverity: number }>();
  for (const log of recent) {
    for (const se of log.sideEffects) {
      const entry = tally.get(se.symptom) ?? { count: 0, totalSeverity: 0 };
      entry.count++;
      entry.totalSeverity += se.severity;
      tally.set(se.symptom, entry);
    }
  }
  return [...tally.entries()]
    .map(([symptom, data]) => ({ symptom, count: data.count, avgSeverity: Math.round((data.totalSeverity / data.count) * 10) / 10 }))
    .sort((a, b) => b.count - a.count);
}

export interface AdherenceSummary {
  activeMeds: number;
  avgAdherence: number; // 0–100 across active meds
}

/** Dashboard-facing summary: number of active medications and average 7-day adherence. */
export function adherenceSummary(): AdherenceSummary {
  const meds = loadMedications().filter((m) => m.active);
  if (meds.length === 0) return { activeMeds: 0, avgAdherence: 0 };
  const total = meds.reduce((sum, m) => sum + adherenceRate(m.id, 7), 0);
  return { activeMeds: meds.length, avgAdherence: Math.round(total / meds.length) };
}
