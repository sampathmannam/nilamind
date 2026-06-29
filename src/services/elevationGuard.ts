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
  for (const list of [SLEEP_DISMISS, SPENDING, GRANDIOSITY]) for (const kw of list) if (n.includes(kw)) markers.push(kw);
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
