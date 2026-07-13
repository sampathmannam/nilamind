// Progress store for an in-flight structured protocol (Phase 1). A protocol is a multi-step, often multi-day
// program (see protocols.ts), so the person's position in it must PERSIST across leaving/reopening the app —
// encrypted at rest via secureLocal (key registered in SENSITIVE_KEYS), exactly like the diary / session chat.
// Deliberately tiny: just {which protocol, which step}. Nila reads this to continue where the person left off.
import { secureLocal } from "./secureLocal";
import { getProtocol, routeToProtocol, type Protocol, type ProtocolStep } from "./protocols";
import { markProtocolComplete, recordProtocolAbandon as recordAbandon, recordStepComplete as recordStepDone, recordStepStart } from "./protocolAdherence";

const KEY = "nilamind_protocol_progress";
// Append-only completion log (2026-07-12 QA: dashboard analytics dead-counters, F14). Separate from KEY above —
// KEY is the single-slot "where am I now" pointer and is CLEARED on completion; this is a durable record of
// every finished program so usageAnalytics.protocolCompletions() has real data instead of a hardcoded 0.
const COMPLETIONS_KEY = "nilamind_protocol_completions";

interface CompletionRecord {
  protocolId: string;
  at: string; // ISO timestamp
}

function recordCompletion(protocolId: string): void {
  try {
    const raw = secureLocal.getItem(COMPLETIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list: CompletionRecord[] = Array.isArray(parsed) ? parsed : [];
    list.push({ protocolId, at: new Date().toISOString() });
    secureLocal.setItem(COMPLETIONS_KEY, JSON.stringify(list));
  } catch {
    /* best-effort — a failed completion-log write must never block the program from finishing */
  }
}

interface Progress {
  protocolId: string;
  stepIndex: number;
}

// undefined = not yet hydrated this process; null = no active program; else the active {protocolId, stepIndex}.
let active: Progress | null | undefined = undefined;

function hydrate(): Progress | null {
  if (active === undefined) {
    try {
      const raw = secureLocal.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      active =
        parsed && typeof parsed.protocolId === "string" && typeof parsed.stepIndex === "number"
          ? { protocolId: parsed.protocolId, stepIndex: parsed.stepIndex }
          : null;
    } catch {
      active = null; // a corrupt/undecryptable blob must never wedge the program
    }
  }
  return active;
}

function persist(): void {
  try {
    if (active) secureLocal.setItem(KEY, JSON.stringify(active));
    else secureLocal.removeItem(KEY);
  } catch {
    /* best-effort — a failed write just means this step isn't resumable after a kill, never a live-session break */
  }
}

export interface ActiveStep {
  protocol: Protocol;
  step: ProtocolStep;
  stepIndex: number;
  total: number;
}

/** Begin a protocol at its first step. Returns the first step, or null if the id is unknown. */
export function startProtocol(id: string): ActiveStep | null {
  const p = getProtocol(id);
  if (!p) return null;
  active = { protocolId: id, stepIndex: 0 };
  persist();
  recordStepStart(id, p.steps[0].id, 0);
  return { protocol: p, step: p.steps[0], stepIndex: 0, total: p.steps.length };
}

/** The current step of the active program, or null if none / stale. Self-heals an invalid stored state. */
export function getActiveProgress(): ActiveStep | null {
  const a = hydrate();
  if (!a) return null;
  const p = getProtocol(a.protocolId);
  if (!p || a.stepIndex < 0 || a.stepIndex >= p.steps.length) {
    active = null;
    persist(); // stored program points at a removed protocol / out-of-range step → clear it
    return null;
  }
  return { protocol: p, step: p.steps[a.stepIndex], stepIndex: a.stepIndex, total: p.steps.length };
}

/** Move to the next step. Returns the new step, or `{done:true, protocol}` when the program is complete (and clears it). */
export function advanceProtocol(): ActiveStep | { done: true; protocol: Protocol } | null {
  const a = hydrate();
  if (!a) return null;
  const p = getProtocol(a.protocolId);
  if (!p) {
    active = null;
    persist();
    return null;
  }
  const next = a.stepIndex + 1;
  if (next >= p.steps.length) {
    // Persist a completion record (2026-07-12 QA: finishing a program left ZERO trace — the single-slot
    // pointer was simply removed, and usageAnalytics.protocolCompletions() was a hardcoded-0 stub).
    recordStepDone(a.protocolId, p.steps[a.stepIndex].id);
    markProtocolComplete(a.protocolId);
    recordCompletion(a.protocolId);
    active = null;
    persist();
    return { done: true, protocol: p };
  }
  recordStepDone(a.protocolId, p.steps[a.stepIndex].id);
  recordStepStart(a.protocolId, p.steps[next].id, next);
  active = { protocolId: a.protocolId, stepIndex: next };
  persist();
  return { protocol: p, step: p.steps[next], stepIndex: next, total: p.steps.length };
}

/** Drop the active program (explicit "stop"/"not now"). */
export function abandonProtocol(): void {
  const a = hydrate();
  if (a) recordAbandon(a.protocolId);
  active = null;
  persist();
}

/**
 * Should Nila OFFER a structured protocol on this turn? Returns the matched protocol, or null. Offers ONLY when
 * nothing is already active (never interrupt an in-progress program) AND the concern matches a module (never
 * force a protocol onto a benign message — the research says only *matched* routing helps). The caller must
 * still gate on §9/crisis (never offer during a crisis turn) and on offer frequency (don't re-offer every turn).
 */
export function protocolOffer(userMessage: string): Protocol | null {
  if (getActiveProgress()) return null;
  return routeToProtocol(userMessage);
}
