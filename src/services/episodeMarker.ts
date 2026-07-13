// episodeMarker — a longitudinal bipolar-PHASE tracker. Distinct from the per-episode distress log
// (EpisodeRecord: trigger/skills/intensity) and from momentary daily check-ins: a marker tags a
// STRETCH of time by how mood ran (elevated / depressed / mixed / steady). The user owns the label —
// we never auto-diagnose. Wellness framing throughout: a pattern over time, not a clinical verdict.
//
// The only consumer of the data is the user (and their clinician, via the device-local PDF). Nothing
// leaves the device.

import { appendToSecureArray, secureLocal } from "./secureLocal";

export type EpisodePhase = "elevated" | "depressed" | "mixed" | "stable";

export interface EpisodeMarker {
  id: string;
  /** Inclusive start, YYYY-MM-DD. */
  startDate: string;
  /** Inclusive end, YYYY-MM-DD (may equal startDate for a single day). */
  endDate: string;
  phase: EpisodePhase;
  note: string;
  createdAt: string; // ISO timestamp
}

const STORAGE_KEY = "nilamind_episode_markers";
const DAY_MS = 86_400_000;

const PHASES: readonly EpisodePhase[] = ["elevated", "depressed", "mixed", "stable"];

function parse(d: string): number {
  const t = new Date(d + "T00:00:00").getTime();
  return Number.isNaN(t) ? NaN : t;
}

/** True when the range is well-formed and the phase is known. */
export function validateMarker(m: EpisodeMarker): boolean {
  if (!PHASES.includes(m.phase)) return false;
  const s = parse(m.startDate);
  const e = parse(m.endDate);
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return s <= e;
}

export function readEpisodeMarkers(): EpisodeMarker[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EpisodeMarker[]) : [];
  } catch {
    return [];
  }
}

/** Append a marker. Throws (and persists nothing) on an invalid range/phase so callers can't write
 *  corrupt phase history. */
export function addEpisodeMarker(m: EpisodeMarker): EpisodeMarker[] {
  if (!validateMarker(m)) throw new Error("Invalid episode marker");
  return appendToSecureArray<EpisodeMarker>(STORAGE_KEY, m);
}

function contains(m: EpisodeMarker, today: string): boolean {
  const t = parse(today);
  if (Number.isNaN(t)) return false;
  return parse(m.startDate) <= t && t <= parse(m.endDate);
}

/** The marker covering `today` (most recently created wins on overlap), or null. */
export function currentPhase(all: EpisodeMarker[] = readEpisodeMarkers(), today: string = new Date().toISOString().split("T")[0]): EpisodeMarker | null {
  const covering = all.filter((m) => contains(m, today));
  if (covering.length === 0) return null;
  return covering.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function episodeMarkerSummary(all: EpisodeMarker[] = readEpisodeMarkers(), today: string = new Date().toISOString().split("T")[0]): string {
  const cur = currentPhase(all, today);
  if (!cur) return "";
  const range = cur.startDate === cur.endDate ? cur.startDate : `${cur.startDate}–${cur.endDate}`;
  return `- They've marked a ${cur.phase} period (${range})${cur.note ? `: "${cur.note}"` : ""}. This is their own phase tag — a pattern they noticed, not a verdict.`;
}
