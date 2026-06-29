import { secureLocal } from "./secureLocal";
// Validated symptom-screening instruments (PHQ-9, GAD-7).
//
// These are the field-standard, research-validated self-report measures. Everything here —
// item wording, the 0–3 response anchors, the total-score severity bands, and the screening
// cut-points — is taken directly from the original validation papers, NOT paraphrased or
// "calibrated" by us. We must not invent items, reword them, or shift the cut-offs, because the
// psychometrics (sensitivity/specificity) only hold for the validated form.
//
//   PHQ-9 — Kroenke, K., Spitzer, R. L., & Williams, J. B. W. (2001). "The PHQ-9: Validity of a
//           brief depression severity measure." J. Gen. Intern. Med., 16(9), 606–613.
//           (PHQ-2 short form: Kroenke, Spitzer & Williams, 2003, Medical Care, 41, 1284–1292.)
//   GAD-7 — Spitzer, R. L., Kroenke, K., Williams, J. B. W., & Löwe, B. (2006). "A brief measure
//           for assessing generalized anxiety disorder: the GAD-7." Arch. Intern. Med., 166(10),
//           1092–1097.
//
// Both instruments are in the public domain (Pfizer placed the PHQ/GAD family in the public
// domain; no permission required to use, reproduce, or display).
//
// IMPORTANT, by design: these are SCREENING tools, not diagnoses. Elevated scores indicate that a
// conversation with a professional is worthwhile — they do not, on their own, mean a person "has"
// a disorder. The UI must say this plainly, and PHQ-9 item 9 (self-harm ideation) must always
// route to crisis support when endorsed at all.

export type InstrumentId = "PHQ-2" | "PHQ-9" | "GAD-7" | "WHO-5" | "PSS-4";

export interface SeverityBand {
  min: number; // inclusive
  max: number; // inclusive
  label: string;
  // gentle, non-clinical interpretation shown to the user
  interpretation: string;
  // a soft, non-alarming colour token used by the UI (maps to Tailwind families)
  tone: "emerald" | "sky" | "amber" | "orange" | "rose";
}

export interface Instrument {
  id: InstrumentId;
  name: string;
  fullName: string;
  measures: string;
  // The exact stem the validated forms use.
  prompt: string;
  // Verbatim items from the validation paper, in order.
  items: string[];
  // The response anchors, in order (index === per-item score, 0..responseOptions.length-1).
  responseOptions: string[];
  maxScore: number; // max TOTAL score (after any multiplier)
  // 0-based item indices that are reverse-scored (score = maxPerItem - response) — e.g. PSS-4 items 2 & 3.
  reverseItems?: number[];
  // Multiply the raw summed score by this (e.g. WHO-5 ×4 → 0–100). Default 1.
  scoreMultiplier?: number;
  // True when a HIGHER score is better (e.g. WHO-5 wellbeing). Default false (higher = more symptoms).
  higherIsBetter?: boolean;
  // Published severity bands (total-score → label).
  bands: SeverityBand[];
  // The widely-used screening cut-point and its reported operating characteristics.
  cutPoint: { score: number; note: string };
  // Index (0-based) of a safety-critical item that must trigger crisis routing if endorsed > 0.
  // Only PHQ-9 has one (item 9, self-harm ideation).
  safetyItemIndex?: number;
  citation: string;
}

const RESPONSE_OPTIONS = [
  "Not at all",
  "Several days",
  "More than half the days",
  "Nearly every day",
];

export const PHQ9: Instrument = {
  id: "PHQ-9",
  name: "PHQ-9",
  fullName: "Patient Health Questionnaire-9",
  measures: "Depression",
  prompt:
    "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  items: [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    "Trouble concentrating on things, such as reading the newspaper or watching television",
    "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
    "Thoughts that you would be better off dead, or of hurting yourself in some way",
  ],
  responseOptions: RESPONSE_OPTIONS,
  maxScore: 27,
  bands: [
    { min: 0, max: 4, label: "Minimal", tone: "emerald", interpretation: "Few or no signs of depression over the last two weeks. This is a good moment to keep doing what's working for you." },
    { min: 5, max: 9, label: "Mild", tone: "sky", interpretation: "Some symptoms are present. Watchful waiting, self-care, and the tools in this app are reasonable steps; keep an eye on how things move." },
    { min: 10, max: 14, label: "Moderate", tone: "amber", interpretation: "This is around the level where talking with a doctor or therapist is genuinely worth it. It doesn't mean something is wrong with you — it means support could help." },
    { min: 15, max: 19, label: "Moderately severe", tone: "orange", interpretation: "These symptoms are weighing on you a lot right now. Reaching out to a professional is strongly encouraged — you don't have to carry this alone." },
    { min: 20, max: 27, label: "Severe", tone: "rose", interpretation: "You're carrying a heavy load right now. Please consider contacting a doctor, therapist, or a helpline soon. Support exists, and this is exactly what it's for." },
  ],
  cutPoint: { score: 10, note: "A score of 10 or more is the common screening threshold for major depression (reported sensitivity ≈ 88%, specificity ≈ 88%; Kroenke et al., 2001)." },
  safetyItemIndex: 8, // item 9 (0-based)
  citation: "Kroenke, Spitzer & Williams (2001), J. Gen. Intern. Med. 16(9):606–613.",
};

export const GAD7: Instrument = {
  id: "GAD-7",
  name: "GAD-7",
  fullName: "Generalized Anxiety Disorder-7",
  measures: "Anxiety",
  prompt:
    "Over the last 2 weeks, how often have you been bothered by the following problems?",
  items: [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it is hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid, as if something awful might happen",
  ],
  responseOptions: RESPONSE_OPTIONS,
  maxScore: 21,
  bands: [
    { min: 0, max: 4, label: "Minimal", tone: "emerald", interpretation: "Little sign of anxiety over the last two weeks. A good baseline to notice and protect." },
    { min: 5, max: 9, label: "Mild", tone: "sky", interpretation: "Some anxiety is present. Grounding, breathing, and the coping tools here are well-suited to this level." },
    { min: 10, max: 14, label: "Moderate", tone: "amber", interpretation: "Around this level, a conversation with a professional is worth considering. Anxiety this persistent is very treatable." },
    { min: 15, max: 21, label: "Severe", tone: "rose", interpretation: "Anxiety is taking a real toll right now. Please consider reaching out to a doctor, therapist, or helpline — effective help is available." },
  ],
  cutPoint: { score: 10, note: "A score of 10 or more is the recommended cut-point for generalized anxiety (reported sensitivity ≈ 89%, specificity ≈ 82%; Spitzer et al., 2006)." },
  citation: "Spitzer, Kroenke, Williams & Löwe (2006), Arch. Intern. Med. 166(10):1092–1097.",
};

// PHQ-2 — the 2-item ultra-brief depression screen (first two PHQ-9 items). A 30-second triage:
// a score of 3+ is the cut-point for "likely depression → take the full PHQ-9".
export const PHQ2: Instrument = {
  id: "PHQ-2",
  name: "PHQ-2",
  fullName: "Patient Health Questionnaire-2",
  measures: "Depression · 30-sec screen",
  prompt: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  items: [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
  ],
  responseOptions: RESPONSE_OPTIONS,
  maxScore: 6,
  bands: [
    { min: 0, max: 2, label: "Negative screen", tone: "emerald", interpretation: "Below the screening cut-off for depression right now. You can re-check any time, or take the full PHQ-9 for a fuller picture." },
    { min: 3, max: 6, label: "Positive screen", tone: "amber", interpretation: "At or above the screening cut-off. Taking the full PHQ-9 gives a clearer picture, and a chat with a professional is worth considering." },
  ],
  cutPoint: { score: 3, note: "A PHQ-2 score of 3 or more is the screening cut-point for likely depression (reported sensitivity ≈ 83%, specificity ≈ 92%; Kroenke et al., 2003) — a positive screen warrants the full PHQ-9." },
  citation: "Kroenke, Spitzer & Williams (2003), Medical Care 41(11):1284–1292.",
};

// WHO-5 Well-Being Index — 5 items, 0–5 scale, raw 0–25 ×4 → 0–100 (higher = better wellbeing).
const WHO5_OPTIONS = ["At no time", "Some of the time", "Less than half the time", "More than half the time", "Most of the time", "All of the time"];
export const WHO5: Instrument = {
  id: "WHO-5",
  name: "WHO-5",
  fullName: "WHO-5 Well-Being Index",
  measures: "Wellbeing",
  prompt: "Over the last two weeks, how much of the time has each statement been true for you?",
  items: [
    "I have felt cheerful and in good spirits",
    "I have felt calm and relaxed",
    "I have felt active and vigorous",
    "I woke up feeling fresh and rested",
    "My daily life has been filled with things that interest me",
  ],
  responseOptions: WHO5_OPTIONS,
  maxScore: 100,
  scoreMultiplier: 4,
  higherIsBetter: true,
  bands: [
    { min: 0, max: 28, label: "Low wellbeing", tone: "rose", interpretation: "A score this low is worth taking seriously — it's a recognised screen-point for depression. Consider the full PHQ-9 and reaching out to someone you trust or a professional." },
    { min: 29, max: 50, label: "Reduced wellbeing", tone: "amber", interpretation: "Below the typical wellbeing threshold. Keep an eye on it and lean on your tools; a professional check-in is reasonable if it persists." },
    { min: 51, max: 100, label: "Good wellbeing", tone: "emerald", interpretation: "Within a healthy range. Worth noticing what's supporting your wellbeing so you can protect it." },
  ],
  cutPoint: { score: 50, note: "A WHO-5 score of 50 or below (raw ≤13) is the recommended cut-off for low wellbeing / possible depression; ≤28 suggests likely depression and warrants follow-up (Topp et al., 2015)." },
  citation: "Topp, Østergaard, Søndergaard & Bech (2015), Psychother. Psychosom. 84(3):167–176.",
};

// PSS-4 Perceived Stress Scale-4 — 4 items, 0–4 scale; items 2 & 3 (0-based 1 & 2) are reverse-scored.
const PSS4_OPTIONS = ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"];
export const PSS4: Instrument = {
  id: "PSS-4",
  name: "PSS-4",
  fullName: "Perceived Stress Scale-4",
  measures: "Stress",
  prompt: "In the last month, how often have you felt this way?",
  items: [
    "Felt that you were unable to control the important things in your life",
    "Felt confident about your ability to handle your personal problems",
    "Felt that things were going your way",
    "Felt difficulties were piling up so high that you could not overcome them",
  ],
  responseOptions: PSS4_OPTIONS,
  maxScore: 16,
  reverseItems: [1, 2],
  bands: [
    { min: 0, max: 5, label: "Low stress", tone: "emerald", interpretation: "Your perceived stress is low right now — a good baseline to notice and protect." },
    { min: 6, max: 10, label: "Moderate stress", tone: "amber", interpretation: "A moderate load. Grounding, paced breathing, and the coping tools here fit this level well." },
    { min: 11, max: 16, label: "High stress", tone: "rose", interpretation: "Stress is running high. Be gentle with yourself; consider what you can set down, and reaching out for support." },
  ],
  cutPoint: { score: 6, note: "The PSS-4 has no official clinical cut-off (it's a continuous measure); these low/moderate/high bands are conventional thirds for self-tracking, not a diagnosis (Cohen & Williamson, 1988; Warttig et al., 2013)." },
  citation: "Cohen & Williamson (1988); validation: Warttig, Forshaw, South & White (2013), J. Health Psychol. 18(12):1617–1628.",
};

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  "PHQ-2": PHQ2,
  "PHQ-9": PHQ9,
  "GAD-7": GAD7,
  "WHO-5": WHO5,
  "PSS-4": PSS4,
};

export interface ScoredResult {
  total: number;
  band: SeverityBand;
  /** True only for PHQ-9 when the self-harm item (item 9) is endorsed at any level > 0. */
  safetyFlag: boolean;
}

/**
 * Score a completed instrument. `responses` holds one value per item (each 0..maxPerItem, where
 * maxPerItem = responseOptions.length - 1), in item order. Applies reverse-scoring and any score
 * multiplier (e.g. WHO-5 ×4). Throws on wrong length / out-of-range — we never silently mis-score a
 * clinical instrument.
 */
export function scoreAssessment(instrumentId: InstrumentId, responses: number[]): ScoredResult {
  const inst = INSTRUMENTS[instrumentId];
  if (!inst) throw new Error(`Unknown instrument: ${instrumentId}`);
  if (responses.length !== inst.items.length) {
    throw new Error(`${instrumentId} expects ${inst.items.length} responses, got ${responses.length}`);
  }
  const maxPerItem = inst.responseOptions.length - 1;
  const reverse = new Set(inst.reverseItems ?? []);
  let raw = 0;
  responses.forEach((r, i) => {
    if (!Number.isInteger(r) || r < 0 || r > maxPerItem) {
      throw new Error(`Each ${instrumentId} response must be an integer 0–${maxPerItem} (got ${r})`);
    }
    raw += reverse.has(i) ? maxPerItem - r : r;
  });
  const total = raw * (inst.scoreMultiplier ?? 1);
  const band = inst.bands.find((b) => total >= b.min && total <= b.max) ?? inst.bands[inst.bands.length - 1];
  const safetyFlag =
    inst.safetyItemIndex !== undefined && (responses[inst.safetyItemIndex] ?? 0) > 0;
  return { total, band, safetyFlag };
}

// ── Persistence (localStorage; mirrors the app's existing storage pattern) ──

export interface AssessmentEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // locale time string
  instrument: InstrumentId;
  responses: number[];
  total: number;
  severity: string; // band label at time of completion
  safetyFlag: boolean; // PHQ-9 item-9 endorsed
}

const STORAGE_KEY = "nilamind_assessments";

export function loadAssessments(): AssessmentEntry[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AssessmentEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveAssessment(entry: AssessmentEntry): AssessmentEntry[] {
  const all = loadAssessments();
  all.push(entry);
  try {
    secureLocal.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to persist assessment:", e);
  }
  return all;
}

export function assessmentsFor(instrumentId: InstrumentId, all?: AssessmentEntry[]): AssessmentEntry[] {
  return (all ?? loadAssessments())
    .filter((a) => a.instrument === instrumentId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.timestamp.localeCompare(b.timestamp));
}

export function latestFor(instrumentId: InstrumentId, all?: AssessmentEntry[]): AssessmentEntry | null {
  const list = assessmentsFor(instrumentId, all);
  return list.length ? list[list.length - 1] : null;
}

/** Days since an entry was recorded (floored). PHQ-9/GAD-7 ask about a 2-week window, so the UI
 *  uses this to gently suggest a weekly/fortnightly cadence rather than daily completion. */
export function daysSince(entry: AssessmentEntry | null): number | null {
  if (!entry) return null;
  const then = new Date(entry.date + "T00:00:00").getTime();
  const now = new Date(new Date().toISOString().split("T")[0] + "T00:00:00").getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / 86400000));
}
