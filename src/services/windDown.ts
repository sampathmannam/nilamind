// On-device sleep wind-down — pure, deterministic content + helpers. No model, no network.
// Supportive/educational, NEVER medical (see the §9 section of the Wind-Down spec). The worry-park text is
// crisis-checked via checkWindDownText and is never persisted by this module.
import { detectCrisis } from "./crisisClassifier";

export interface SleepTip {
  id: string;
  text: string;
  basis: string;
}

// Invitation-framed, cited. Clinical-review guardrails are baked into the COPY: stimulus control is gentle +
// qualified (sleep interruption isn't for everyone — destabilizing for some conditions), alcohol is stated factually
// rather than as advice to avoid (AUD-aware), and a "limits" tip points to a clinician.
// PERMANENT GUARD — never add sleep-restriction language (delaying bedtime, capping/cutting time in
// bed, "sleep less" to build sleep pressure) to SLEEP_TIPS or any wind-down copy. Even clinician-
// modified, monitored CBT-I-BP protocols in bipolar disorder logged manic-symptom adverse events
// despite net benefit, per Harvey, Soehner, Kaplan et al. (2015), J Consulting and Clinical Psychology;
// and sleep deprivation independently lowers seizure threshold, per Dell'Aquila & Soti (2022), Sleep
// Science. NilaMind is manic-first/bipolar-aware — this module's guidance must stay duration-preserving
// (steadying WHEN you sleep), never duration-restricting (cutting HOW LONG you're allowed to sleep).
const SLEEP_RESTRICTION_PATTERNS: RegExp[] = [
  /restrict(ing|ed)?\s+(your\s+)?time in bed/i,
  /(go(ing)?|stay(ing)?)\s+to\s+bed\s+later/i,
  /delay(ing|ed)?\s+(your\s+)?bedtime/i,
  /stay(ing)?\s+up\s+later/i,
  /(shorten(ing|ed)?|cut(ting)?|cap(ping)?|reduc(e|ing|ed))\s+(your\s+)?(time in bed|sleep window|hours? (of|in) (bed|sleep))/i,
  /sleep\s+less/i,
  /cut(ting)?\s+(back on|down (on)?)\s+(your\s+)?sleep/i,
];

/** True if `text` contains sleep-restriction language. SLEEP_TIPS content must NEVER match this —
 *  see the permanent guard comment above. Additive, deterministic, no model. */
export function containsSleepRestrictionLanguage(text: string): boolean {
  return SLEEP_RESTRICTION_PATTERNS.some((re) => re.test(text));
}

export const SLEEP_TIPS: SleepTip[] = [
  {
    id: "wake-time",
    text: "Many people find that waking at about the same time each day — even on weekends — gently steadies their sleep rhythm.",
    basis: "Sleep scheduling / stimulus control (Spielman; AASM).",
  },
  {
    id: "stimulus-control",
    text: "If you've been lying awake a while and it feels frustrating, some people find it helps to get up and do something calm in dim light, then come back when sleepy. If getting up feels worse, the breathing step alone is enough.",
    basis: "Stimulus control (Bootzin 1972) — offered gently; sleep interruption isn't for everyone.",
  },
  {
    id: "bed-for-sleep",
    text: "Keeping the bed mostly for sleep helps some people's minds link it with rest rather than scrolling or worrying.",
    basis: "Stimulus control (Bootzin 1972).",
  },
  {
    id: "alcohol",
    text: "A nightcap can make you drowsy at first, but alcohol tends to fragment sleep later in the night.",
    basis: "Sleep-fragmentation evidence (Ebrahim et al.) — stated as a fact, not advice.",
  },
  {
    id: "screens",
    text: "Dimming bright screens in the last hour can make it a little easier for some people to drift off.",
    basis: "Evening light & melatonin (Gooley et al. 2011).",
  },
  {
    id: "daylight",
    text: "A few minutes of daylight in the morning helps many people's body clocks settle the following night.",
    basis: "Circadian light exposure (Terman; AASM).",
  },
  {
    id: "limits",
    text: "These are gentle habits, not rules. If sleep stays hard for weeks — or your body clock feels far off — a GP or sleep clinician can help more than tips can.",
    basis: "Scope/limits — psychoeducation, not treatment.",
  },
];

/** Deterministic "tip of the night": stable within a local day, varies across days. */
export function nightlyTip(date: Date = new Date()): SleepTip {
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return SLEEP_TIPS[key % SLEEP_TIPS.length];
}

export interface WindDownStep {
  id: string;
  title: string;
  body: string;
  skippable: boolean;
}

export const WINDDOWN_STEPS: WindDownStep[] = [
  {
    id: "park",
    title: "Park the day",
    body: "Jot anything on your mind for tomorrow, and one tiny next-step for each — then set it down. (Optional — if writing worries makes it louder, skip straight to breathing.)",
    skippable: true,
  },
  {
    id: "settle",
    title: "Settle your body",
    body: "A minute of slow breathing — out-breath a little longer than the in-breath. Let your shoulders drop.",
    skippable: false,
  },
  {
    id: "close",
    title: "Let the day be done",
    body: "You got through today. Nothing more is required of you tonight.",
    skippable: false,
  },
];

const RK = "nilamind_winddown_reminder"; // plain localStorage, non-sensitive (on/off + HH:MM only)
export interface WindDownReminder {
  enabled: boolean;
  time: string; // "HH:MM"
}
const DEFAULT_REMINDER: WindDownReminder = { enabled: false, time: "22:00" };

export function getWindDownReminder(): WindDownReminder {
  try {
    const raw = localStorage.getItem(RK);
    if (!raw) return { ...DEFAULT_REMINDER };
    return { ...DEFAULT_REMINDER, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_REMINDER };
  }
}

export function setWindDownReminder(p: Partial<WindDownReminder>): void {
  const next = { ...getWindDownReminder(), ...p };
  try {
    localStorage.setItem(RK, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
}

/** §9 gate for the worry textarea — classifier-backed detectCrisis (keyword floor + euphemism catch). The
 *  screen surfaces crisis help on `true` and never persists the text. Additive/fail-closed vs the keyword scan. */
export async function checkWindDownText(text: string): Promise<boolean> {
  return detectCrisis(text);
}
