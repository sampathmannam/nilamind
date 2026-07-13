import { secureLocal } from "./secureLocal";
import { ls } from "./storageUtils";
import { loadValuesWork, type ValueDomain as WorkDomain } from "./valuesWork";
// Values Compass — the "engagement" side of Acceptance and Commitment Therapy (ACT): clarifying
// what matters to you, noticing where your life has drifted from it, and taking small "toward" steps.
//
// Why values (not goals): in ACT, values are chosen life *directions* (like "west"), not finish
// lines. You can move toward them in any moment, regardless of mood — which is exactly why this
// pairs with Behavioural Activation. Depression and anxiety narrow life down to "away moves"
// (avoidance); re-contacting values widens it back out.
//
// Structure follows the Valued Living Questionnaire (VLQ): for each life domain you rate how
// IMPORTANT it is and how CONSISTENTLY you've lived in line with it recently. The clinically useful
// signal is the GAP between the two — high importance + low consistency = where committed action
// will matter most.
//
// Evidence base (primary sources):
//   • Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (1999/2011). Acceptance and Commitment Therapy.
//   • Wilson, K. G., Sandoz, E. K., Kitchens, J., & Roberts, M. (2010). The Valued Living
//     Questionnaire. The Psychological Record, 60(2), 249–272. — importance × consistency structure.
//   • Hayes, S. C., Luoma, J. B., Bond, F. W., Masuda, A., & Lillis, J. (2006). ACT: model, processes
//     and outcomes. Behaviour Research and Therapy, 44(1), 1–25.
//   • A-Tjak, J. G. L., et al. (2015). A meta-analysis of the efficacy of ACT. Psychotherapy and
//     Psychosomatics, 84(1), 30–36.

export interface ValueDomain {
  id: string;
  label: string;
  examples: string; // gentle, inclusive prompts — not prescriptions
}

// Adapted from the VLQ domains, worded inclusively (no assumption of partner/children/religion).
export const VALUE_DOMAINS: ValueDomain[] = [
  { id: "family", label: "Family", examples: "the kind of relative you want to be — present, patient, honest" },
  { id: "close", label: "Close relationships", examples: "intimacy, partnership, the people closest to you" },
  { id: "friends", label: "Friends & social", examples: "connection, showing up, belonging" },
  { id: "work", label: "Work & purpose", examples: "doing work that means something, however small" },
  { id: "growth", label: "Learning & growth", examples: "curiosity, skills, becoming who you want to be" },
  { id: "play", label: "Play & recreation", examples: "fun, rest, creativity, things you do just because" },
  { id: "health", label: "Health & body", examples: "movement, sleep, eating, caring for the body you live in" },
  { id: "meaning", label: "Spirituality or meaning", examples: "faith, nature, awe, a sense of something larger — whatever that is for you" },
  { id: "community", label: "Community & contribution", examples: "helping, citizenship, leaving things better" },
  { id: "nature", label: "Nature & environment", examples: "time outdoors, your relationship with the living world" },
];

export interface DomainRating {
  importance: number; // 0–10
  consistency: number; // 0–10 (how consistently lived recently)
}

export interface ValuesSnapshot {
  date: string; // YYYY-MM-DD
  timestamp: string;
  ratings: Record<string, DomainRating>; // domainId → rating
}

export interface CommittedAction {
  id: string;
  date: string;
  domainId: string;
  action: string;
  status: "open" | "done";
  doneDate?: string;
}

const SNAPSHOT_KEY = "nilamind_values";
const ACTIONS_KEY = "nilamind_values_actions";

export function loadValues(): ValuesSnapshot | null {
  try {
    const raw = secureLocal.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.ratings ? (parsed as ValuesSnapshot) : null;
  } catch (e) {
    console.error("[values] failed to load values:", e);
    return null;
  }
}

export function saveValues(snapshot: ValuesSnapshot): void {
  try {
    secureLocal.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.error("Failed to persist values snapshot");
  }
}

export function loadActions(): CommittedAction[] {
  try {
    const raw = secureLocal.getItem(ACTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CommittedAction[]) : [];
  } catch (e) {
    console.error("[values] failed to load actions:", e);
    return [];
  }
}

export function saveActions(all: CommittedAction[]): void {
  try {
    secureLocal.setItem(ACTIONS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to persist committed actions");
  }
}

export function upsertAction(entry: CommittedAction): CommittedAction[] {
  const all = loadActions();
  const idx = all.findIndex((a) => a.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  saveActions(all);
  return all;
}

export function domainLabel(id: string): string {
  return VALUE_DOMAINS.find((d) => d.id === id)?.label ?? id;
}

export interface ValueGap {
  domainId: string;
  label: string;
  importance: number;
  consistency: number;
  gap: number; // importance - consistency, clamped at 0
}

/**
 * Compute the importance–consistency gaps. We only surface domains the person actually cares about
 * (importance ≥ `minImportance`), because a gap only matters where the value matters. Sorted by the
 * widest gap first — that's where a small committed action has the most leverage (VLQ rationale).
 */
export function computeGaps(snapshot: ValuesSnapshot | null, minImportance = 6): ValueGap[] {
  if (!snapshot) return [];
  const gaps: ValueGap[] = [];
  for (const [domainId, r] of Object.entries(snapshot.ratings)) {
    if (r.importance < minImportance) continue;
    gaps.push({
      domainId,
      label: domainLabel(domainId),
      importance: r.importance,
      consistency: r.consistency,
      gap: Math.max(0, r.importance - r.consistency),
    });
  }
  return gaps.sort((a, b) => b.gap - a.gap || b.importance - a.importance);
}

// ── One-time migration: valuesWork.ts (uncited duplicate) → values.ts (VLQ-cited) ──
//
// Wave 3 Group B (docs/superpowers/plans/2026-07-12-wave3-technical-specs.md §5): valuesWork.ts has no
// citation of its own anywhere in the service file; values.ts is the tool ValuesToActionScreen.tsx
// actually cites to users (Wilson, Sandoz, Kitchens & Roberts, 2010 — the Valued Living Questionnaire).
// This migration is ADDITIVE/MERGE ONLY:
//   • it never reads-then-deletes nilamind_values_work — the source store is left completely intact,
//     so it can always be re-derived from or manually inspected later;
//   • it never overwrites an existing nilamind_values rating for a domain the person already rated
//     directly in the VLQ tool (both tools have been live at once, so overlap is possible) — the
//     existing VLQ answer always wins, and the shadowed valuesWork rating is reported back rather than
//     silently dropped.

// 6 exact id matches + 1 relabel (spirituality→meaning) + 1 lossy many-to-one (relationships→close — a
// best-effort single mapping; spec §5 flags close+friends→relationships as direction-ambiguous, so we
// deliberately do not attempt to split it). self_care / autonomy / user-added vw_* domains have no VLQ
// destination at all (spec §5 domain-compatibility table) and are reported as unmigrated, not dropped.
const DOMAIN_REMAP: Record<string, string> = {
  family: "family",
  work: "work",
  growth: "growth",
  play: "play",
  health: "health",
  community: "community",
  spirituality: "meaning",
  relationships: "close",
};

export interface UnmigratedDomain {
  domainId: string; // original valuesWork.ts id
  name: string; // original valuesWork.ts label, for a user-facing summary
  reason: string;
}

export interface ValuesMigrationResult {
  migratedRatings: number;
  migratedActions: number;
  notMigrated: UnmigratedDomain[];
}

function hasWorkData(d: WorkDomain): boolean {
  return d.importance > 0 || d.currentAlignment > 0 || d.committedAction.trim() !== "" || d.completed;
}

// Guarantees a unique "va_"-prefixed id even when several actions migrate within the same millisecond
// (isStepId() in valuesToAction.ts only checks the "va_" prefix, so any suffix is safe).
let migrationActionCounter = 0;

/**
 * Additive, merge-based migration from valuesWork.ts's single fused store into values.ts's two VLQ
 * stores (nilamind_values snapshot + nilamind_values_actions log). Never touches nilamind_values_work.
 * Never overwrites an existing values.ts rating.
 */
export function migrateValuesWorkToVlq(): ValuesMigrationResult {
  const workDomains = loadValuesWork();
  const result: ValuesMigrationResult = { migratedRatings: 0, migratedActions: 0, notMigrated: [] };
  if (workDomains.length === 0) return result;

  const existingSnapshot = loadValues();
  const ratings: Record<string, DomainRating> = existingSnapshot ? { ...existingSnapshot.ratings } : {};
  const existingActions = loadActions();
  const newActions: CommittedAction[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const d of workDomains) {
    if (!hasWorkData(d)) continue; // untouched default-seeded domain — nothing to carry over

    const newId = DOMAIN_REMAP[d.id];
    if (!newId) {
      result.notMigrated.push({
        domainId: d.id,
        name: d.name,
        reason: d.id.startsWith("vw_")
          ? "a custom value you added — Values to Action doesn't support custom domains yet"
          : "no equivalent area in Values to Action",
      });
      continue;
    }

    if (ratings[newId]) {
      // Both tools were live and this domain was already rated directly in the VLQ tool — keep that
      // answer, never clobber it (spec §5 silent-data-loss warning).
      result.notMigrated.push({
        domainId: d.id,
        name: d.name,
        reason: `you already rated "${domainLabel(newId)}" in Values to Action — kept that rating`,
      });
    } else {
      ratings[newId] = { importance: d.importance, consistency: d.currentAlignment };
      result.migratedRatings++;
    }

    // Actions are independent of the rating-clobber-avoidance above: nilamind_values_actions is an
    // unbounded append-only log (not a single overwritten field), so a migrated action never conflicts
    // with an existing one — it's just one more row.
    if (d.committedAction.trim() !== "") {
      newActions.push({
        id: `va_${Date.now()}_${migrationActionCounter++}`,
        date: today, // valuesWork.ts kept no per-action date — fabricated as "migrated on <today>" (spec §5)
        domainId: newId,
        action: d.committedAction.trim(),
        status: d.completed ? "done" : "open",
        doneDate: d.completed ? (d.completedAt ? d.completedAt.split("T")[0] : today) : undefined,
      });
      result.migratedActions++;
    }
  }

  if (result.migratedRatings > 0) {
    saveValues({ date: today, timestamp: new Date().toLocaleTimeString(), ratings });
  }
  if (newActions.length > 0) {
    saveActions([...existingActions, ...newActions]);
  }

  return result;
}

const MIGRATED_FLAG_KEY = "nilamind_values_migrated";

/**
 * Runs migrateValuesWorkToVlq() at most once per install. The flag is a non-sensitive boolean (no
 * rating content) so, like other one-shot completion flags in this app, it lives in plain localStorage
 * rather than the encrypted secureLocal store. Fails safe: if localStorage is unavailable, this is a
 * no-op (never blocks the app), and migration is simply re-attempted next boot.
 */
export function runValuesMigrationIfNeeded(): ValuesMigrationResult | null {
  const store = ls();
  if (!store) return null;
  try {
    if (store.getItem(MIGRATED_FLAG_KEY) === "1") return null;
  } catch (e) {
    return null;
  }
  const result = migrateValuesWorkToVlq();
  try {
    store.setItem(MIGRATED_FLAG_KEY, "1");
  } catch (e) {
    console.error("[values] failed to persist migration flag — may re-run next boot");
  }
  return result;
}
