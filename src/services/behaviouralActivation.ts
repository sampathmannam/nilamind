import { secureLocal } from "./secureLocal";
// Behavioural Activation (BA) — the most strongly-evidenced behavioural treatment for depression.
//
// The mechanism (Lewinsohn's behavioural model): depression lowers activity → less contact with
// natural reward → lower mood → further withdrawal. BA breaks the loop by scheduling valued and
// rewarding activity *regardless of motivation* ("outside-in", acting your way into feeling rather
// than waiting to feel like it), and by monitoring each activity for Mastery (a sense of
// accomplishment) and Pleasure (enjoyment) so the person re-learns what actually lifts them.
//
// Evidence base (primary sources):
//   • Lewinsohn, P. M. (1974). A behavioral approach to depression. — reduced response-contingent
//     positive reinforcement as the core of depression.
//   • Jacobson, N. S., Dobson, K. S., Truax, P. A., et al. (1996). A component analysis of CBT for
//     depression. J. Consult. Clin. Psychol., 64(2), 295–304. — BA alone matched full CBT.
//   • Martell, C. R., Addis, M. E., & Jacobson, N. S. (2001). Depression in Context. — the
//     "outside-in" stance and the TRAP→TRAC avoidance model.
//   • Dimidjian, S., Hollon, S. D., Dobson, K. S., et al. (2006). J. Consult. Clin. Psychol.,
//     74(4), 658–670. — BA matched antidepressants for moderate-to-severe depression.
//   • Ekers, D., et al. (2014). PLoS ONE, 9(6), e100100; Mazzucchelli, T., Kane, R., & Rees, C.
//     (2009). Clin. Psychol. Sci. Pract., 16(4), 383–411. — meta-analyses confirming efficacy.
//   • Mastery/Pleasure activity scheduling: Beck, A. T., Rush, A. J., Shaw, B. F., & Emery, G.
//     (1979). Cognitive Therapy of Depression.
//
// BA is graded: start absurdly small. The activity menu therefore frames every item with a "tiny
// version" so an exhausted person can still take one real step.

export type BACategory = "movement" | "connection" | "mastery" | "pleasure" | "meaning";

export interface ActivityIdea {
  title: string;
  category: BACategory;
  tiny: string; // the smallest real version — graded-task principle
}

export interface CategoryMeta {
  id: BACategory;
  label: string;
  blurb: string;
  tone: "emerald" | "sky" | "amber" | "purple" | "rose";
  basis: string;
}

export const BA_CATEGORIES: CategoryMeta[] = [
  {
    id: "movement",
    label: "Movement",
    tone: "emerald",
    blurb: "Getting the body going — even gently — is one of the most reliable mood lifts.",
    basis: "Physical activity has a moderate antidepressant effect (Schuch et al., 2016, Am. J. Psychiatry, meta-analysis) and is a core BA target.",
  },
  {
    id: "connection",
    label: "Connection",
    tone: "sky",
    blurb: "Contact with people counters the withdrawal that depression pulls you toward.",
    basis: "Social withdrawal reduces positive reinforcement (Lewinsohn, 1974); reconnection is a primary BA domain (Martell et al., 2001).",
  },
  {
    id: "mastery",
    label: "Mastery",
    tone: "amber",
    blurb: "Small acts of completion rebuild a sense of 'I can affect my world.'",
    basis: "Mastery scheduling counters helplessness and is half of the Mastery/Pleasure method (Beck et al., 1979).",
  },
  {
    id: "pleasure",
    label: "Pleasure",
    tone: "purple",
    blurb: "Gentle, sensory enjoyment — re-learning that some things still feel good.",
    basis: "Pleasant-event scheduling restores response-contingent reward (Lewinsohn & Graf, 1973, J. Consult. Clin. Psychol.).",
  },
  {
    id: "meaning",
    label: "Meaning",
    tone: "rose",
    blurb: "Acting on what matters to you, not just what feels urgent.",
    basis: "Values-linked activation strengthens BA outcomes (Martell et al., 2001; overlaps ACT valued action).",
  },
];

// A compact, low-barrier menu drawn from the Pleasant Events Schedule (Lewinsohn) and BA practice.
// Deliberately ordinary and small — BA works through frequency and graded steps, not grand gestures.
export const ACTIVITY_MENU: ActivityIdea[] = [
  { title: "Walk outside", category: "movement", tiny: "Stand on the doorstep for one minute" },
  { title: "Stretch or gentle yoga", category: "movement", tiny: "Roll your shoulders five times" },
  { title: "Tidy one surface", category: "movement", tiny: "Put one item back where it belongs" },
  { title: "Dance to one song", category: "movement", tiny: "Sway while the kettle boils" },

  { title: "Text someone back", category: "connection", tiny: "Send a single 👋 to one person" },
  { title: "Sit near another person", category: "connection", tiny: "Be in the same room as someone for 2 min" },
  { title: "Call a friend or family member", category: "connection", tiny: "Listen to one voice note from them" },
  { title: "Reply to one message you've avoided", category: "connection", tiny: "Open it and read it, no reply needed yet" },

  { title: "Do one small task you've put off", category: "mastery", tiny: "Set a 2-minute timer and start" },
  { title: "Make your bed", category: "mastery", tiny: "Pull the duvet straight" },
  { title: "Prepare one proper meal", category: "mastery", tiny: "Pour a glass of water and drink it" },
  { title: "Learn one small thing", category: "mastery", tiny: "Read one paragraph of something" },

  { title: "Warm shower or bath", category: "pleasure", tiny: "Wash your face with warm water" },
  { title: "Listen to music you love", category: "pleasure", tiny: "Play 30 seconds of one song" },
  { title: "Make a warm drink", category: "pleasure", tiny: "Hold a warm mug in both hands" },
  { title: "Sit in sunlight", category: "pleasure", tiny: "Open one curtain" },

  { title: "Do something kind for someone", category: "meaning", tiny: "Think of one person you appreciate" },
  { title: "Spend time on something you value", category: "meaning", tiny: "Name one thing that matters to you" },
  { title: "Be in nature", category: "meaning", tiny: "Look at the sky for 30 seconds" },
  { title: "Care for a plant or pet", category: "meaning", tiny: "Give a plant a little water" },
];

export interface BAActivityLog {
  id: string;
  date: string; // YYYY-MM-DD the activity is for / was done
  timestamp: string;
  title: string;
  category: BACategory;
  status: "planned" | "done" | "skipped";
  // Acting before motivation: capture the mood/urge BEFORE, then mastery+pleasure AFTER.
  moodBefore?: number; // 0–10 (optional pre-rating)
  mastery?: number; // 0–10, sense of accomplishment (rated after doing)
  pleasure?: number; // 0–10, enjoyment (rated after doing)
  note?: string;
}

const STORAGE_KEY = "nilamind_ba_activities";

export function loadActivities(): BAActivityLog[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BAActivityLog[]) : [];
  } catch {
    return [];
  }
}

export function saveActivities(all: BAActivityLog[]): void {
  try {
    secureLocal.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to persist BA activities:", e);
  }
}

export function upsertActivity(entry: BAActivityLog): BAActivityLog[] {
  const all = loadActivities();
  const idx = all.findIndex((a) => a.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  saveActivities(all);
  return all;
}

export function categoryMeta(id: BACategory): CategoryMeta {
  return BA_CATEGORIES.find((c) => c.id === id) ?? BA_CATEGORIES[0];
}

export interface BAInsight {
  done: number;
  planned: number;
  avgMastery: number | null;
  avgPleasure: number | null;
  // The category with the highest combined mastery+pleasure across this person's own logs.
  topCategory: { id: BACategory; label: string; score: number } | null;
}

/**
 * Derive a gentle, personalised insight from the user's OWN ratings — no population norms.
 * Returns nulls until there is enough completed-and-rated data to be honest about.
 */
export function computeInsight(all?: BAActivityLog[]): BAInsight {
  const acts = all ?? loadActivities();
  const done = acts.filter((a) => a.status === "done");
  const planned = acts.filter((a) => a.status === "planned");
  const rated = done.filter((a) => typeof a.mastery === "number" && typeof a.pleasure === "number");

  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  const avgMastery = avg(rated.map((a) => a.mastery as number));
  const avgPleasure = avg(rated.map((a) => a.pleasure as number));

  let topCategory: BAInsight["topCategory"] = null;
  if (rated.length >= 3) {
    const byCat = new Map<BACategory, number[]>();
    for (const a of rated) {
      const combined = (a.mastery as number) + (a.pleasure as number);
      byCat.set(a.category, [...(byCat.get(a.category) ?? []), combined]);
    }
    let best: { id: BACategory; score: number } | null = null;
    for (const [id, scores] of byCat) {
      const m = scores.reduce((s, x) => s + x, 0) / scores.length;
      if (!best || m > best.score) best = { id, score: m };
    }
    if (best) topCategory = { id: best.id, label: categoryMeta(best.id).label, score: best.score };
  }

  return { done: done.length, planned: planned.length, avgMastery, avgPleasure, topCategory };
}
