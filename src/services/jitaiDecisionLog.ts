// jitaiDecisionLog — capped, privacy-safe log of JITAI decision points (2026-07-12 Wave 3 §6).
// Mirrors exportAudit.ts's shape/pattern (same appendToSecureArray primitive, same MAX_ENTRIES precedent).
//
// PRIVACY: deliberately excludes nudgeText/lastUserText — matches notifications.ts's "CONTENT-FREE... a
// lock-screen must not leak a mental-health conversation" discipline. `triggers` + `suggestedTool` is enough
// to evaluate the decision rule (was an intervention offered, what kind, was it suppressed and why) without
// persisting anything sensitive.
//
// Keeps assessJitai() pure (matches the codebase's existing pure/side-effect split, cf. computeProactiveMoment()
// pure vs. recordProactiveShown()/dismissProactive() side-effecting in proactiveEngine.ts) — this file is the
// thin, side-effecting wrapper around it.

import { appendToSecureArray, secureLocal } from "./secureLocal";
import { isJitaiCooldownActive, markJitaiShown, type JitaiDecision, type JitaiTrigger } from "./jitaiEngine";

const LOG_KEY = "nilamind_jitai_decisions";
const MAX_ENTRIES = 100; // matches exportAudit.ts precedent

export type JitaiSurface = "in_app_card" | "chat_context" | "notification";
export type JitaiSuppressedBy = "quiet_hours" | "crisis_latch" | "trigger_cooldown" | "none";

export interface JitaiDecisionLogEntry {
  timestamp: number;                 // Date.now() at the decision point
  triggers: JitaiTrigger[];          // tailoring-variable state that fired
  severity: "gentle" | "noticeable" | "urgent";
  fired: boolean;                    // was an intervention actually offered, or gated/suppressed?
  suppressedBy?: JitaiSuppressedBy;
  suggestedTool: string | null;      // decision rule's chosen intervention option, never raw nudge text
  surface: JitaiSurface;
  engaged: boolean | null;           // resolved lazily; null = window not yet elapsed. Resolution itself
                                      // (lastActiveAt-based lazy marking, per spec doc §6) is out of scope for
                                      // this pass — not called for by any Group F task step; the field is
                                      // reserved so a later pass can populate it without a shape migration.
  engagedAt?: number;
}

/** Write a decision-point entry. Fire-and-forget via the atomic shared-array primitive (mirrors exportAudit.ts's
 *  recordExportAudit) — never blocks a nudge because logging failed. */
export function logJitaiDecision(
  decision: Pick<JitaiDecision, "triggers" | "severity" | "suggestedTool">,
  surface: JitaiSurface,
  opts?: { fired?: boolean; suppressedBy?: JitaiSuppressedBy },
): void {
  try {
    const entry: JitaiDecisionLogEntry = {
      timestamp: Date.now(),
      triggers: decision.triggers,
      severity: decision.severity,
      fired: opts?.fired ?? true,
      suggestedTool: decision.suggestedTool,
      surface,
      engaged: null,
    };
    if (opts?.suppressedBy) entry.suppressedBy = opts.suppressedBy;
    appendToSecureArray(LOG_KEY, entry, MAX_ENTRIES);
  } catch {
    // never block a nudge because logging failed
  }
}

/** Read the JITAI decision log (newest last, matches exportAudit.ts's getExportAudit() convention). */
export function getJitaiDecisionLog(): JitaiDecisionLogEntry[] {
  try {
    const raw = secureLocal.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Combined receptivity-gate + log wrapper — the one call a delivery site (ModeScreen.tsx, nilaContext.ts)
 * needs. Gates on the DECISION's primary trigger (triggers[0] — the same trigger assessJitai() itself uses
 * to pick nudgeText/suggestedTool, so the gate tracks exactly what's being delivered). Logs every real
 * decision point (fired or suppressed) but skips logging entirely when there's nothing to decide
 * (shouldNudge:false) — matches "skip stateEngine.ts:123, internal aggregation with no independent delivery"
 * from spec doc §6: no decision, no entry.
 */
export function logAndGateJitaiDecision(
  decision: JitaiDecision,
  surface: JitaiSurface,
): { fired: boolean; suppressedBy?: JitaiSuppressedBy } {
  if (!decision.shouldNudge || decision.triggers.length === 0) {
    return { fired: false };
  }
  const primary = decision.triggers[0];
  const onCooldown = isJitaiCooldownActive(primary);
  const fired = !onCooldown;
  const suppressedBy: JitaiSuppressedBy | undefined = fired ? undefined : "trigger_cooldown";
  logJitaiDecision(decision, surface, { fired, suppressedBy });
  if (fired) markJitaiShown(primary);
  return { fired, suppressedBy };
}
