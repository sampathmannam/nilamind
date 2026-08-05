import { secureLocal } from "./secureLocal";
import { loadSecureArray } from "./secureData";
// DBT Skills Practice — the mechanism loop that turns skill *exposure* into skill *use*.
//
// The mechanism (Neacsiu, Rizvi & Linehan, 2010, BRAT 48(9):832-9): DBT skills use prospectively
// mediated DBT's treatment effects on suicidal behavior, depression, and anger control. Daily skill
// use predicts lower symptom severity (Stepp et al., 2008); on days skills are used, same-day
// suicidal ideation is lower (Probst et al., 2018). The app's job is to get the user to *do* a skill
// in the moment and record whether it helped — not to show them more cards.
//
// This service mirrors the `behaviouralActivation.ts` pattern exactly: typed logs, encrypted
// persistence via secureLocal, and a pure `computeInsight` that derives personalised insights from
// the person's OWN ratings — no population norms. The before/after urge pair is the DBT-analogue of
// BA's mastery/pleasure pair: it turns the diary card from a log into a learning loop.
//
// Evidence base (primary sources):
//   • Neacsiu, A. D., Rizvi, S. L., & Linehan, M. M. (2010). Dialectical behavior therapy skills
//     use as a mediator and outcome of treatment. BRAT, 48(9), 832-9.
//   • Stepp, S. D., et al. (2008). Daily diary-card skills use predicted lower BPD symptom severity.
//   • Probst, T., et al. (2018). On days skills were successfully used, same-day suicidal ideation
//     was lower.
//   • Cavicchioli, M., et al. (2019). Skills use predicted reduced substance use in AUD treatment.
//   • Durpoix, M., et al. (2023). Transdiagnostic DBT skills group: skills use correlated with
//     improved emotional instability → reduced suicidal thoughts.
//   • Rizvi, S. L., et al. (2011/2016). DBT Coach: in-the-moment skill coaching reduced NSSI.

export type SkillFamily = "mindfulness" | "distress" | "emotion" | "interpersonal" | "crisis";

export interface SkillPractice {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  skillId: string; // id in SKILLS / ALL_DIARY_DBT_SKILLS
  family: SkillFamily;
  // The before/after urge pair is core, evidence-defined (Neacsiu 2010; Jacobson 2001 BA pattern).
  // Without it there's no learning signal that skill practice actually shifted arousal.
  urgeBefore?: number;    // 0–5, rated BEFORE doing the skill
  intensityBefore?: number; // 0–10, emotion intensity before
  intensityAfter?: number;  // 0–10, emotion intensity after
  helped?: "helped" | "no_help" | null;
  context?: "chat" | "diary" | "protocol" | "breathing" | "coach" | "checkin";
}

const STORAGE_KEY = "nilamind_skill_practice";

export function loadPractices(): SkillPractice[] {
  return loadSecureArray<SkillPractice>(STORAGE_KEY);
}

export function savePractices(all: SkillPractice[]): void {
  try {
    secureLocal.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to persist skill practices");
  }
}

export function upsertPractice(entry: SkillPractice): SkillPractice[] {
  const all = loadPractices();
  const idx = all.findIndex((p) => p.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  savePractices(all);
  return all;
}

export interface SkillPracticeInsight {
  totalPractices: number;
  familyCounts: Partial<Record<SkillFamily, number>>;
  skillCounts: Record<string, number>;
  skillHelpedRates: Record<string, number>; // 0–1, only for skills with >= 2 rated practices
  avgUrgeDrop: number | null; // mean(urgeBefore - intensityAfter) across practices with both ratings
  familyBalance: "balanced" | "crisis_dominant" | "none"; // crisis > 60% → crisis_dominant
}

/**
 * Derive a gentle, personalised insight from the user's OWN ratings — no population norms.
 * Returns honest nulls/empty until there is enough data to be honest about.
 */
export function computeInsight(all?: SkillPractice[]): SkillPracticeInsight {
  const plays = all ?? loadPractices();

  if (plays.length === 0) {
    return {
      totalPractices: 0,
      familyCounts: {},
      skillCounts: {},
      skillHelpedRates: {},
      avgUrgeDrop: null,
      familyBalance: "none",
    };
  }

  // Per-family counts
  const familyCounts: Partial<Record<SkillFamily, number>> = {};
  for (const p of plays) {
    familyCounts[p.family] = (familyCounts[p.family] ?? 0) + 1;
  }

  // Per-skill counts
  const skillCounts: Record<string, number> = {};
  for (const p of plays) {
    skillCounts[p.skillId] = (skillCounts[p.skillId] ?? 0) + 1;
  }

  // Per-skill helped rates (only for skills with >= 2 rated practices)
  const skillHelpedRates: Record<string, number> = {};
  const bySkill = new Map<string, { helped: number; rated: number }>();
  for (const p of plays) {
    if (p.helped === undefined || p.helped === null) continue;
    const entry = bySkill.get(p.skillId) ?? { helped: 0, rated: 0 };
    entry.rated += 1;
    if (p.helped === "helped") entry.helped += 1;
    bySkill.set(p.skillId, entry);
  }
  for (const [skillId, { helped, rated }] of bySkill) {
    if (rated >= 2) skillHelpedRates[skillId] = helped / rated;
  }

  // Average urge drop (urgeBefore - intensityAfter) across practices with both ratings
  const urgeDrops: number[] = [];
  for (const p of plays) {
    if (typeof p.urgeBefore === "number" && typeof p.intensityAfter === "number") {
      urgeDrops.push(p.urgeBefore - p.intensityAfter);
    }
  }
  const avgUrgeDrop = urgeDrops.length > 0
    ? urgeDrops.reduce((s, x) => s + x, 0) / urgeDrops.length
    : null;

  // Family balance: crisis > 60% of total → crisis_dominant
  const total = plays.length;
  const crisisCount = familyCounts["crisis"] ?? 0;
  const familyBalance: SkillPracticeInsight["familyBalance"] =
    total >= 3 && crisisCount / total > 0.6 ? "crisis_dominant" : "balanced";

  return {
    totalPractices: total,
    familyCounts,
    skillCounts,
    skillHelpedRates,
    avgUrgeDrop,
    familyBalance,
  };
}
