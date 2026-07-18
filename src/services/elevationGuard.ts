import { loadCheckins } from "./checkin";
import type { CheckInEntry } from "../types";
import { getNaps, isLateLongNap } from "./napTracking";

// Deterministic elevation / mania-risk guard — defends against the sycophancy → mania-amplification harm
// (Østergaard 2023, Schizophr Bull). This is NOT §9 (acute crisis): it catches grandiose / high-risk MANIC
// content and steers Nila to gently reality-anchor instead of validating or amplifying it.
//
// Why DETERMINISTIC: the clinical red-panel finding is that the on-device 1B cannot be trusted to perform
// calibrated reality-testing (it sycophantically agrees, which AMPLIFIES mania, or ruptures the alliance).
// So we don't hope the model behaves — we (1) inject a hard system-prompt steer when elevation is detected,
// and (2) for the single most dangerous marker (stopping meds), append a soft scripted line to the reply
// regardless of what the model said. Keyword-based + high-precision (over-firing reality-checks a non-manic
// person, which is invalidating), mirroring scanForCrisis's normalize-then-substring approach.

export type ElevationLevel = "none" | "elevated" | "high";

// HIGH — stopping psychiatric meds is the most dangerous manic decision; treat on its own tier.
const MED_STOP = [
  "stop taking my meds", "stop taking my medication", "stopped my meds", "stopped taking my meds",
  "off my meds", "quit my meds", "quit my medication", "quitting my meds", "stopping my meds",
  "stopping my medication", "stop my medication", "don't need my meds", "don't need medication",
  "don't need my medication", "flushed my pills", "threw out my meds",
];
// ELEVATED — dismissive-of-sleep (manic, not insomnia), impulsive spending, grandiosity.
const SLEEP_DISMISS = ["don't need sleep", "do not need sleep", "don't need to sleep", "who needs sleep", "sleep is for", "too wired to sleep"];
const SPENDING = ["spending spree", "maxed out my card", "maxed out my credit", "emptied my savings", "emptied my account", "spent all my money", "spent everything", "can't stop spending"];
const GRANDIOSITY = ["i'm a genius", "i am a genius", "figured it all out", "figured everything out", "chosen one", "special mission", "i'm unstoppable", "i am unstoppable", "i'm invincible", "destined for greatness", "smarter than everyone", "i can change the world tonight"];
// RACING / pressured thoughts — a core DSM hypomania/mania criterion the guard previously missed. Kept
// high-precision by REQUIRING a mind/thoughts/brain subject, so anxiety's "heart is racing" and literal
// "racing to catch the bus" stay none (an ELEVATED steer = slow down + protect sleep, which is low-harm even
// if the person is anxious, but firing on bare "racing" would over-fire and invalidate).
const RACING = [
  "mind is racing", "thoughts are racing", "racing thoughts",
  "mind won't stop", "mind wont stop", "thoughts won't stop", "thoughts wont stop",
  "brain won't shut off", "brain wont shut off", "brain won't turn off", "brain wont turn off",
  "can't turn my brain off", "cant turn my brain off", "can't slow my thoughts", "cant slow my thoughts",
];
// HYPERSEXUALITY — hypersexuality is a classic manic prodrome signal (DSM-5 criterion B7: increase in
// goal-directed activity involving a high risk of painful consequences, including sexual indiscretions).
// ELEVATED tier: these are unambiguous hypersexuality markers with near-zero benign collision.
const HYPERSEXUALITY = [
  "hypersexual", "sex drive is through the roof", "can't stop thinking about sex",
  "sleeping with everyone", "risky sexual",
];
// RELIGIOUS grandiosity — grandiose religious ideation is a well-documented manic prodrome (Goodwin & Jamison
// 2007). ELEVATED tier: unambiguous divine-mission / messianic phrasing with near-zero benign collision.
const RELIGIOUS_GRANDIOSITY = [
  "god is speaking to me", "i am a prophet", "chosen by god", "divine mission",
  "i am the messiah", "god has chosen me",
];
// SLEEP_AMAZING — passive euphoric sleep-denial: "haven't slept and I feel amazing" is the manic opposite
// of insomnia, a classic elevation marker. ELEVATED tier.
const SLEEP_AMAZING = [
  "haven't slept and i feel amazing", "barely sleeping and i feel incredible",
  "sleep barely matters anymore", "running on 2 hours and i feel amazing",
];
// PRESSURED — behavioral markers of pressured speech, a core DSM criterion. ELEVATED tier: these are
// self-aware metacognitive disclosures ("everyone says i'm talking too fast"), not the bare "talking" benign
// collisions (a chat app has "talking" everywhere).
const PRESSURED = [
  "can't stop talking", "thoughts pouring out", "thoughts are pouring",
  "everyone says i'm talking too fast",
  "talking too fast", "i'm talking too fast",
];
// IRRITABLE / agitated — DSM-5 mania criterion A includes irritable mood (not just euphoric). The guard
// previously had zero coverage for irritable/agitated mania, which is a common and clinically dangerous
// presentation. ELEVATED tier: unambiguous agitation markers with near-zero benign collision.
// "snapping at everyone" and "everything is annoying me" are strong metacognitive disclosures of irritable
// elevation; bare "irritable" alone is not listed (too broad — overlaps with low mood / PMS / stress).
const IRRITABLE = [
  "snapping at everyone", "snapping at people", "snapped at everyone",
  "everything is annoying me", "everything is pissing me off", "everything is irritating me",
  "pissed off at everyone", "angry at everyone for no reason",
  "feel like screaming", "feel like punching something",
];
// DISTRACTIBLE — increased distractibility is a DSM-5 mania criterion (B6). The guard previously had zero
// coverage. ELEVATED tier: self-aware metacognitive disclosures of manic distractibility. Ordinary
// concentration complaints ("can't focus at work", "too distracted by my phone") are deliberately excluded —
// they're far more common in depression/anxiety/adhd and would over-fire.
const DISTRACTIBLE = [
  "jumping between a million things", "jumping between everything",
  "everything is grabbing my attention", "can't finish anything i start",
  "starting too many things at once", "started ten things today",
];
// INCREASED_ACTIVITY — increased goal-directed activity is a DSM-5 mania criterion (B7). The guard
// previously had zero coverage. ELEVATED tier: unambiguous behavioral markers of manic project-spawning.
const INCREASED_ACTIVITY = [
  "starting too many projects", "started a million projects", "new project every day",
  "can't stop starting new things", "too many ideas to keep up",
  "multiple projects at once", "on fire with new ideas", "too many plans all at once",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/['’]/g, "'").replace(/\s+/g, " ").trim();
}

/** Deterministic detector. Returns the elevation level + which markers matched (for transparency/tests). */
export function detectElevationRisk(text: string): { level: ElevationLevel; markers: string[] } {
  if (!text) return { level: "none", markers: [] };
  const n = normalize(text);
  const markers: string[] = [];
  let high = false;
  for (const kw of MED_STOP) if (n.includes(kw)) { markers.push(kw); high = true; }
  for (const list of [SLEEP_DISMISS, SPENDING, GRANDIOSITY, RACING, HYPERSEXUALITY, RELIGIOUS_GRANDIOSITY, SLEEP_AMAZING, PRESSURED, IRRITABLE, DISTRACTIBLE, INCREASED_ACTIVITY]) for (const kw of list) if (n.includes(kw)) markers.push(kw);
  if (high) return { level: "high", markers };
  if (markers.length) return { level: "elevated", markers };
  return { level: "none", markers: [] };
}

const ANCHOR =
  "\n\nSAFETY — POSSIBLE ELEVATION: this person may be in an elevated or manic state. Do NOT validate or " +
  "amplify grand plans, risk-taking, sudden certainty, big spending, or \"I don't need sleep/meds.\" Stay " +
  "warm, slow it down, gently reality-check, protect their sleep, and nudge toward a trusted person or their " +
  "doctor — never cheer it on, never pile on excitement. Brief and caring, not alarmed.";

/** System-prompt steer appended when elevation is detected (empty otherwise). The soft/LLM layer. */
export function elevationGuardNote(level: ElevationLevel): string {
  return level === "none" ? "" : ANCHOR;
}

/** Reliable scripted line appended to the REPLY for the most dangerous marker (stopping meds) — because we
 *  can't trust the model to raise it. Empty for none/elevated. */
export function elevationOutputNote(level: ElevationLevel): string {
  return level === "high"
    ? "And gently — before anything with your meds, please loop in your doctor or someone you trust. That's a big call to make alone, especially when things feel fast right now."
    : "";
}

/** Load check-in energy data and detect sustained elevation prodrome from rapidly rising energy.
 *  Requires ≥3 check-ins with energy data within the last 7 days. Mirrors the approach used by
 *  emaElevationSignal but for day-granular check-in self-reports. */
export function energyElevationSignal(): ElevationLevel {
  try {
    const all: CheckInEntry[] = loadCheckins();
    if (all.length === 0) return "none";

    const cutoff = Date.now() - 86400000 * 7;
    const withEnergy = all
      .filter((e) => e && typeof e.energy === "number" && e.date && new Date(e.date).getTime() >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date)); // oldest first

    if (withEnergy.length < 3) return "none";

    const vals = withEnergy.map((e) => e.energy as number);
    const half = Math.ceil(vals.length / 2);
    const firstAvg = vals.slice(0, half).reduce((s, n) => s + n, 0) / half;
    const secondAvg = vals.slice(-half).reduce((s, n) => s + n, 0) / half;
    const diff = secondAvg - firstAvg;
    const last = vals[vals.length - 1];

    if (diff >= 1.5 && last >= 4) return "high";
    if (diff >= 0.8 && last >= 3) return "elevated";
    return "none";
  } catch {
    return "none";
  }
}

/** Load logged naps and detect an elevation prodrome from frequent / late-long daytime napping.
 *  Frequent long naps — especially after ~3pm — correlate with bipolar mood elevation and a disrupted
 *  circadian rhythm (Milner & Cote 2014, J Sleep Res). Requires ≥3 naps in the last 14 days and at least
 *  one "late-long" nap (the rhythm-disrupting kind) so a single quiet afternoon rest never fires. Mirrors
 *  energyElevationSignal's stored-data, high-precision shape. */
export function napElevationSignal(now: Date = new Date()): ElevationLevel {
  const cutoff = now.getTime() - 86400000 * 14;
  const naps = getNaps().filter((n) => {
    const [y, m, d] = n.date.split("-").map(Number);
    const t = new Date(y, (m || 1) - 1, d || 1).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  if (naps.length < 3) return "none";
  const lateLong = naps.filter((n) => isLateLongNap(n.start, n.minutes)).length;
  if (naps.length >= 5 && lateLong >= 2) return "high";
  if (naps.length >= 3 && lateLong >= 1) return "elevated";
  return "none";
}
