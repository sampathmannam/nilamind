// Progress store for an in-flight structured protocol (Phase 1). A protocol is a multi-step, often multi-day
// program (see protocols.ts), so the person's position in it must PERSIST across leaving/reopening the app —
// encrypted at rest via secureLocal (key registered in SENSITIVE_KEYS), exactly like the diary / session chat.
// Deliberately tiny: just {which protocol, which step}. Nila reads this to continue where the person left off.
import { secureLocal } from "./secureLocal";
import { getProtocol, type Protocol, type ProtocolStep } from "./protocols";

const KEY = "nilamind_protocol_progress";

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
    active = null;
    persist();
    return { done: true, protocol: p };
  }
  active = { protocolId: a.protocolId, stepIndex: next };
  persist();
  return { protocol: p, step: p.steps[next], stepIndex: next, total: p.steps.length };
}

/** Drop the active program (explicit "stop"/"not now"). */
export function abandonProtocol(): void {
  active = null;
  persist();
}
