/**
 * allianceSignal.ts — passive therapeutic alliance proxy
 *
 * Computes an implicit alliance estimate from on-device behavioral data, without
 * a formal questionnaire. Based on Bordin (1979) three dimensions — bond, goal
 * agreement, task agreement — each proxied by multiple behavioral signals.
 *
 * Horvath & Symonds (1991) meta: r = .475 between working alliance and outcome;
 * Flückiger et al. (2018, N = 14 771): r = .38 for routine alliance-outcome
 * correlation in naturalistic settings. Monitoring alliance shifts enables
 * relationship-focused feedback (Lambert 2003).
 *
 * All data read from secureLocal — no network, no user-facing questionnaire.
 * Intended for an optional Nila context block and/or a You-tab dashboard card.
 */
import { secureLocal } from "./secureLocal";
import { loadCheckins } from "./checkin";

/* ── Types ────────────────────────────────────────────────── */

export interface AllianceSnapshot {
  /** 0–100 composite of all three dimensions. */
  composite: number;
  /** 0–100 bond sub-score: trust, persistence, self-disclosure. */
  bond: number;
  /** 0–100 goal agreement sub-score: shared purpose, protocol engagement. */
  goals: number;
  /** 0–100 task agreement sub-score: tool adoption, active participation. */
  tasks: number;
  /** ISO date of computation. */
  computedAt: string;
}

export type AllianceTrend = "improving" | "stable" | "declining" | "insufficient_data";

export interface AllianceState {
  /** Most recent snapshot. */
  current: AllianceSnapshot | null;
  /** Trend over the prior window. */
  trend: AllianceTrend;
  /** Prior snapshot (4+ weeks ago) for trend comparison. */
  prior: AllianceSnapshot | null;
}

/* ── Storage ──────────────────────────────────────────────── */

const STORAGE_KEY = "nilamind_alliance_signal";

interface Persisted {
  snapshots: AllianceSnapshot[];
}

function readAll(): AllianceSnapshot[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as Persisted;
    return Array.isArray(p.snapshots) ? p.snapshots : [];
  } catch {
    return [];
  }
}

function persistSnapshots(snapshots: AllianceSnapshot[]): void {
  try {
    // Keep max 12 monthly snapshots (1 year) plus the current.
    const capped = snapshots.slice(-13);
    secureLocal.setItem(STORAGE_KEY, JSON.stringify({ snapshots: capped }));
  } catch {
    console.error("[allianceSignal] persist failed");
  }
}

/* ── Data readers (mocked in tests) ──────────────────────────
 *   These read directly from secureLocal. In tests they are
 *   replaced so we don't need the full encrypted backend.
 */

export interface BehavioralInputs {
  /** Total active days in last 28 days. */
  activeDays28: number;
  /** Total check-ins in last 28 days. */
  checkins28: number;
  /** Ratio of thumbs-up to total feedback in last 28 days. NaN if none. */
  feedbackRatio28: number;
  /** Has a safety plan (1) or not (0). */
  hasSafetyPlan: 0 | 1;
  /** Number of protocol completions ever. */
  protocolCompletions: number;
  /** Has values snapshot (1) or not (0). */
  hasValues: 0 | 1;
  /** BA activities completed in last 28 days. */
  baDone28: number;
  /** App open days in last 28 days. */
  appOpenDays28: number;
  /** Total thought records ever. */
  thoughtRecordCount: number;
  /** Has pact / letter-to-self (1) or not (0). */
  hasPact: 0 | 1;
}

/**
 * Gather the behavioral inputs from secureLocal. Called each time the signal
 * is computed. In test env this is replaced with a mock.
 */
export function gatherInputs(): BehavioralInputs {
  try {
    const appOpens = parseAppOpens();
    const checkins = parseCheckins();
    const feedback = parseFeedback();
    const protocolCompletions = parseProtocolCompletions();
    const ba = parseBA();
    const thoughtRecords = parseThoughtRecords();
    const pact = secureLocal.getItem("nilamind_pact");

    const activeDays28 = countLast28(appOpens);
    const appOpenDays28 = activeDays28; // same source
    const checkins28 = countLast28(checkins);
    const feedbackEntries = last28(feedback);
    const feedbackRatio28 = feedbackEntries.length > 0
      ? feedbackEntries.filter((f: any) => f.rating === "up").length / feedbackEntries.length
      : NaN;

    return {
      activeDays28,
      checkins28,
      feedbackRatio28,
      hasSafetyPlan: secureLocal.getItem("nilamind_safetyplan") ? 1 : 0,
      protocolCompletions,
      hasValues: secureLocal.getItem("nilamind_values") ? 1 : 0,
      baDone28: ba.filter((b: any) => b.status === "done").filter((b: any) => inLast28(b.date)).length,
      appOpenDays28,
      thoughtRecordCount: thoughtRecords.length,
      hasPact: pact ? 1 : 0,
    };
  } catch {
    return {
      activeDays28: 0, checkins28: 0, feedbackRatio28: NaN, hasSafetyPlan: 0,
      protocolCompletions: 0, hasValues: 0, baDone28: 0, appOpenDays28: 0,
      thoughtRecordCount: 0, hasPact: 0,
    };
  }
}

/* ── Computation ───────────────────────────────────────────── */

/**
 * Compute a dimension score (0–100) from weighted behavioral inputs.
 * Weights are heuristic based on evidence strength:
 *   - Bond: check-ins + app opens + feedback + safety-plan + pact
 *   - Goals: protocol completions + values + BA engagement
 *   - Tasks: thought records + BA + check-in depth + app retention
 */
export function computeBond(inputs: BehavioralInputs): number {
  // Active days (28-day retention): 0–28 → 0–30 pts
  const retention = Math.min(30, (inputs.activeDays28 / 28) * 30);
  // Check-in frequency: 0–28 → 0–20 pts
  const freq = Math.min(20, (inputs.checkins28 / 28) * 20);
  // Feedback ratio: 0..1 → 0–15 pts (NaN → 0)
  const fb = inputs.feedbackRatio28 >= 0 ? inputs.feedbackRatio28 * 15 : 0;
  // Safety plan: 0 or 10 pts
  const plan = inputs.hasSafetyPlan * 10;
  // Pact: 0 or 10 pts
  const pact = inputs.hasPact * 10;
  // App opens baseline: 0–28 → 0–15 pts
  const opens = Math.min(15, (inputs.appOpenDays28 / 28) * 15);

  return Math.round(Math.min(100, retention + freq + fb + plan + pact + opens));
}

export function computeGoals(inputs: BehavioralInputs): number {
  // Protocol completions: cap at 6 → 0–40 pts
  const completions = Math.min(40, inputs.protocolCompletions * 7);
  // Values snapshot: 0 or 25 pts
  const values = inputs.hasValues * 25;
  // BA done: cap at 14 → 0–25 pts
  const ba = Math.min(25, (inputs.baDone28 / 14) * 25);
  // App-day baseline: 0–28 → 0–10 pts (consistency)
  const base = Math.min(10, (inputs.appOpenDays28 / 28) * 10);

  return Math.round(Math.min(100, completions + values + ba + base));
}

export function computeTasks(inputs: BehavioralInputs): number {
  // Thought records: cap at 10 → 0–35 pts
  const cr = Math.min(35, inputs.thoughtRecordCount * 3.5);
  // BA done: cap at 14 → 0–30 pts
  const ba = Math.min(30, (inputs.baDone28 / 14) * 30);
  // Check-in frequency: 0–28 → 0–20 pts
  const freq = Math.min(20, (inputs.checkins28 / 28) * 20);
  // App day baseline: 0–28 → 0–15 pts
  const days = Math.min(15, (inputs.appOpenDays28 / 28) * 15);

  return Math.round(Math.min(100, cr + ba + freq + days));
}

export function computeComposite(inputs: BehavioralInputs): number {
  const b = computeBond(inputs);
  const g = computeGoals(inputs);
  const t = computeTasks(inputs);
  return Math.round((b + g + t) / 3);
}

export function computeSnapshot(inputs: BehavioralInputs): AllianceSnapshot {
  return {
    composite: computeComposite(inputs),
    bond: computeBond(inputs),
    goals: computeGoals(inputs),
    tasks: computeTasks(inputs),
    computedAt: new Date().toISOString(),
  };
}

/* ── Trend ────────────────────────────────────────────────── */

const TREND_WINDOW_MS = 28 * 86_400_000; // 4 weeks

/** Compare current snapshot against the most recent prior snapshot older than TREND_WINDOW_MS. */
export function computeTrend(current: AllianceSnapshot, all: AllianceSnapshot[]): AllianceTrend {
  const prior = [...all].reverse().find((s) => {
    const age = new Date(current.computedAt).getTime() - new Date(s.computedAt).getTime();
    return age >= TREND_WINDOW_MS;
  });
  if (!prior) return "insufficient_data";
  const diff = current.composite - prior.composite;
  if (diff >= 5) return "improving";
  if (diff <= -5) return "declining";
  return "stable";
}

/* ── Public API ────────────────────────────────────────────── */

/** Compute a fresh alliance snapshot, store it, and return the full state. */
export function refreshAlliance(): AllianceState {
  const inputs = gatherInputs();
  const snapshot = computeSnapshot(inputs);
  const all = readAll();
  all.push(snapshot);
  persistSnapshots(all);
  const prior = all.length >= 2 ? all[all.length - 2] : null;
  return {
    current: snapshot,
    trend: computeTrend(snapshot, all),
    prior: prior ?? null,
  };
}

/** Load the most recent state without recomputing. */
export function loadAlliance(): AllianceState {
  const all = readAll();
  const current = all.length > 0 ? all[all.length - 1] : null;
  if (!current) return { current: null, trend: "insufficient_data", prior: null };
  const prior = all.length >= 2 ? all[all.length - 2] : null;
  return {
    current,
    trend: computeTrend(current, all),
    prior: prior ?? null,
  };
}

/** Clear all stored snapshots (for tests). */
export function clearAllianceHistory(): void {
  try { secureLocal.removeItem(STORAGE_KEY); } catch { /* best-effort */ }
}

/* ── Internal helpers ─────────────────────────────────────── */

function parseAppOpens(): string[] {
  try {
    const raw = secureLocal.getItem("nilamind_app_opens");
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p.days) ? p.days : [];
  } catch { return []; }
}

function parseCheckins(): string[] {
  try {
    const arr = loadCheckins();
    return arr.map((c: any) => c.date ?? c.timestamp?.split("T")[0] ?? "").filter(Boolean);
  } catch { return []; }
}

function parseFeedback(): any[] {
  try {
    const raw = secureLocal.getItem("nilamind_feedback");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function parseProtocolCompletions(): number {
  try {
    const raw = secureLocal.getItem("nilamind_protocol_completions");
    if (!raw) return 0;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch { return 0; }
}

function parseBA(): any[] {
  try {
    const raw = secureLocal.getItem("nilamind_ba_activities");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function parseThoughtRecords(): any[] {
  try {
    const raw = secureLocal.getItem("nilamind_thought_records");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function countLast28(datedItems: string[]): number {
  const cutoff = Date.now() - 28 * 86_400_000;
  return datedItems.filter((d) => {
    const ts = new Date(d).getTime();
    return !isNaN(ts) && ts >= cutoff;
  }).length;
}

function last28(items: any[]): any[] {
  const cutoff = Date.now() - 28 * 86_400_000;
  return items.filter((item: any) => {
    const ts = new Date(item.at ?? item.date ?? item.timestamp).getTime();
    return !isNaN(ts) && ts >= cutoff;
  });
}

function inLast28(dateStr: string): boolean {
  const ts = new Date(dateStr).getTime();
  return !isNaN(ts) && ts >= Date.now() - 28 * 86_400_000;
}
