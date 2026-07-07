import type { SafetyPlan } from "../types";
import { INITIAL_SAFETY_PLAN } from "../data";

// Defensive load for the safety plan — used by SafetyPlanScreen AND CrisisOverlay, both of which read it at
// the crisis moment. A raw JSON.parse there was fragile: a corrupt/truncated blob threw (→ silent empty plan)
// and a non-object parse produced a malformed plan. This never throws and recovers every valid string field,
// defaulting anything missing/invalid — so the user's real entries survive schema drift and partial damage.
export function parseSafetyPlan(raw: string | null | undefined): SafetyPlan {
  const plan: SafetyPlan = { ...INITIAL_SAFETY_PLAN };
  if (!raw) return plan;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return plan; // truncated / corrupt → the defaults (unrecoverable, but never crash the crisis surface)
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return plan;
  const obj = parsed as Record<string, unknown>;
  for (const k of Object.keys(INITIAL_SAFETY_PLAN)) {
    if (typeof obj[k] === "string") (plan as unknown as Record<string, unknown>)[k] = obj[k];
  }
  // Preserve lastUpdatedAt from persisted data (B3: follow-up loop needs the timestamp)
  if (typeof obj.lastUpdatedAt === "number" && Number.isFinite(obj.lastUpdatedAt)) {
    plan.lastUpdatedAt = obj.lastUpdatedAt;
  }
  return plan;
}
