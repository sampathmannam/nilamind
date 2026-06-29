// Reach-out (trusted-person bridge) — pure content + helpers. No model, no network, no persistence.
// The app NEVER sends and NEVER stores the recipient/draft; it only prepares an editable opener the user
// sends themselves via their own messaging app. checkReachText is the §9 gate, applied at the SEND action
// (see the Reach-out spec). Educational/supportive, never medical.
import { scanForCrisis } from "../safety";

export interface ReachOpener {
  id: string;
  text: string;
}

// Warm, NON-DISCLOSING, editable openers. None names a diagnosis/self-harm/suicide; every one must pass
// scanForCrisis()===false (tested). The user can always add their own words via "Write my own".
export const REACH_OPENERS: ReachOpener[] = [
  {
    id: "rough-patch",
    text: "Hey — do you have time to talk sometime this week? It's been a bit of a rough patch.",
  },
  {
    id: "friendly-ear",
    text: "Hi, I've been having a hard time lately and could use a friendly ear — no pressure, whenever you're free.",
  },
  {
    id: "call-soon",
    text: "Can I call you sometime soon? I'd just like to catch up and talk a few things through.",
  },
  {
    id: "dont-know-how",
    text: "I don't totally know how to say this, but I've been struggling a bit and wanted to reach out to you.",
  },
];

export interface ReachFraming {
  id: string;
  text: string;
  basis: string;
}

// Gentle, cited encouragements that AFFIRM the act/relationship rather than negate the user's self-belief
// (a flat "you're not a burden" can invalidate someone already carrying perceived-burdensomeness — a
// suicide-risk construct; Joiner / Van Orden et al. 2010). Cited correctly per the hardened spec.
export const REACH_FRAMING: ReachFraming[] = [
  {
    id: "would-want-to-know",
    text: "People who care about you would want to know you're struggling.",
    basis: "Rickwood, Deane, Wilson & Ciarrochi, 2005 — trusted informal others are the preferred first point of contact.",
  },
  {
    id: "few-words",
    text: "You don't have to explain everything — even a few words are enough to open the door.",
    basis: "Gulliver, Griffiths & Christensen, 2010 — not-knowing-how-to-start and over-disclosure apprehension are key help-seeking barriers.",
  },
  {
    id: "courage",
    text: "Letting someone in is a real act of courage.",
    basis: "Gulliver et al., 2010 — gain-framed 'help-seeking is strength' counters the self-reliance barrier.",
  },
];

/** Recipient-less, percent-encoded SMS deep link (Android). iOS historically uses `sms:&body=`; if the
 *  composer opens empty the screen's always-visible Copy is the fallback. Pure + unit-pinned. */
export function buildSmsHref(text: string): string {
  return "sms:?body=" + encodeURIComponent(text);
}

/** Deterministic §9 gate for the editable opener — wraps scanForCrisis. Applied at the SEND action; on a
 *  hit the screen elevates crisis help to primary and demotes (not disables) send. scanForCrisis untouched. */
export function checkReachText(text: string): boolean {
  return scanForCrisis(text);
}
