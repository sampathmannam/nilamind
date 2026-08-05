import { scanForCrisis } from "../safety";
import { normalizeText as normalize } from "./textNormalize";

type DistortionId =
  | "all_or_nothing" | "catastrophizing" | "mind_reading"
  | "overgeneralization" | "personalization" | "emotional_reasoning"
  | "should_statements" | "labeling" | "mental_filter" | "disqualifying_positive";

export interface DistortionMatch {
  id: DistortionId;
  label: string;
  phrase: string;
  question: string;
}

interface DistortionDef {
  id: DistortionId;
  label: string;
  question: string;
  patterns: RegExp[];
}

const DISTORTIONS: DistortionDef[] = [
  {
    id: "all_or_nothing",
    label: "All-or-nothing thinking",
    question: "Is it truly black and white, or is there a middle ground?",
    patterns: [
      /\b(everything (is|goes) (wrong|bad|terrible)|i (always|never) (mess|screw|fail|ruin)|nothing (ever )?goes (right|well)|i can('t)?(not)? (do anything|ever).*(right|well|good))\b/i,
    ],
  },
  {
    id: "catastrophizing",
    label: "Catastrophizing",
    question: "What's the most likely outcome here, not the worst?",
    patterns: [
      /\b(it('?s| is) going to be (a disaster|terrible|the worst|horrible)|my life is (over|ruined)|i('?ll| will) never recover|this will ruin everything|worst case scenario)\b/i,
    ],
  },
  {
    id: "mind_reading",
    label: "Mind reading",
    question: "We can't know what they're thinking for sure — want to check the facts?",
    patterns: [
      // "hates" requires a me/us object (bare "everyone hates" collides with "everyone hates the
      // policy"); the other verbs keep adjacency-only since they were never ambiguous that way.
      // 2026-07-12 adversarial-review hardening: negative lookbehind on "everyone hates (me|us)" so
      // "Not everyone hates me, just my ex's friends" doesn't false-fire (this alternative has no gap
      // tolerance, so the guard only needs to check immediately before the subject).
      /\b(they (all )?think i('?m| am) (stupid|incompetent|a failure|useless|annoying|pathetic)|everyone (is judging|thinks|knows)|(?<!not )(?<!no )everyone hates (?:me|us)\b|she thinks i('?m)|he thinks i('?m)|they must think)\b/i,
      // Gap-tolerant: adverbs between subject and verb, object must be me/us so "everyone hates
      // the policy" stays clean (2026-07-12: "everyone secretly hates me" evaded adjacency form).
      // 2026-07-12 adversarial-review hardening: (a) negative lookbehind excluding "not "/"no "
      // immediately before the subject ("Not everyone hates me" is a benign correction, not mind-reading);
      // (b) joke-marker words (jokingly/playfully/kidding/teasingly) excluded from the gap-filler so banter
      // ("Everyone jokingly hates me for stealing the last donut") isn't absorbed as a plain adverb.
      /\b(?<!not )(?<!no )(everyone|everybody|they all|all of them) (?:(?!jokingly\b|playfully\b|kidding\b|teasingly\b)\w+ ){0,2}(hates?|despises?|is judging|are judging|thinks? (?:i|the worst of)) (?:me|us)\b/i,
    ],
  },
  {
    id: "overgeneralization",
    label: "Overgeneralization",
    question: "Is this a pattern or a single event?",
    patterns: [
      /\b(this (always|never) happens|nothing (ever|always) (goes right|works out)|it never (changes|gets better|works)|no one (ever )?cares)\b/i,
    ],
  },
  {
    id: "personalization",
    label: "Taking things personally",
    question: "Could there be other reasons this happened that aren't about you?",
    patterns: [
      /\b(it('?s)? (all )?my fault|i('?m| am) the reason|because of me|i ruined (it|everything|their day)|i should have (known|stopped|prevented))\b/i,
    ],
  },
  {
    id: "emotional_reasoning",
    label: "Emotional reasoning",
    question: "Feelings are real but they aren't facts — what would the evidence say?",
    patterns: [
      /\b(i feel (like|so) (stupid|worthless|ugly|unlovable|hopeless|a failure|pathetic|useless)|therefore i must be|if i feel.*then it must be)\b/i,
    ],
  },
  {
    id: "should_statements",
    label: "Should statements",
    question: "Would you tell a friend they 'should' have been different?",
    patterns: [
      /\b(i should (have|be|know)|i shouldn('t| not) (have|be|feel)|i('?m| am) supposed to|they should have|he should|she should)\b/i,
    ],
  },
  {
    id: "labeling",
    label: "Labeling",
    question: "Would it be more accurate to describe the action instead of labeling yourself?",
    patterns: [
      // Direct adjacency (original) …
      /\b(i('?m| am) (stupid|worthless|a failure|an idiot|ugly|pathetic|useless|a loser|broken|a burden|incompetent|weak|a mess))\b/i,
      // …and gap-tolerant: up to two qualifier words ("complete", "total", "such a") between copula and
      // label, with a negation lookahead so "i am not a failure" / "i am afraid of failure" stay clean
      // (2026-07-12 device-QA: "i am a complete failure" evaded the adjacency form above).
      // 2026-07-12 adversarial-review hardening: the front lookahead only inspected the token IMMEDIATELY
      // after "i am"/"i'm", but the gap-tolerance group ran AFTER that check — so a single hedge word
      // ("honestly", "truly") between "i am" and "not" defeated the guard entirely ("I'm honestly not a
      // burden..." wrongly fired). The gap-filler itself now also excludes negation words, so they can't be
      // absorbed as filler at any position, not just the immediate-next-token one.
      /\bi('?m| am) (?!not\b|never\b|no longer\b|hardly\b|afraid of\b|scared of\b)(?:(?!not\b|never\b|no longer\b|hardly\b)\w+ ){0,2}(?:a |an )?(?:complete |total |utter |absolute |massive |huge |worthless |useless )?(failure|idiot|loser|burden|mess|disappointment)\b/i,
    ],
  },
  {
    id: "mental_filter",
    label: "Mental filter",
    question: "Were there any positives too?",
    patterns: [
      /\b(the one (bad|wrong|negative) thing|only thing that (went wrong|mattered)|nothing good happened|i can('t)?(not)? think of (a single|one|any) (good|positive))\b/i,
    ],
  },
  {
    id: "disqualifying_positive",
    label: "Disqualifying the positive",
    question: "That good thing still happened — what if it does count?",
    patterns: [
      /\b(that doesn('t| not) (count|matter|mean anything)|it was just (luck|a fluke|nothing)|anyone could have done that|they were just being nice|i got lucky)\b/i,
    ],
  },
];

// normalize() moved to ./textNormalize.ts (2026-08-05 audit): shares the single, already-reviewed
// normalizer with safety.ts and elevationGuard.ts instead of a third independently-drifting copy.
// Aliased as `normalize` so every call site below is unchanged.

export function spotDistortions(text: string): DistortionMatch[] {
  const n = normalize(text);
  const matches: DistortionMatch[] = [];
  for (const dist of DISTORTIONS) {
    for (const re of dist.patterns) {
      const m = n.match(re);
      if (m) {
        matches.push({ id: dist.id, label: dist.label, phrase: m[0], question: dist.question });
        break;
      }
    }
  }
  return matches;
}

/** alliance-voice (2026-07-12 clinical research wave 2): sequence VALIDATE first, challenge SECOND, and
 *  ask AT MOST ONE question — even when several distortions matched in one message. Invalidation-first
 *  replies raise arousal where validation lowers it, per Shenk & Fruzzetti (2011), J Social and Clinical
 *  Psychology; the challenging QUESTION itself carries the evidence (Socratic questioning predicts
 *  next-session symptom change), so one well-placed question beats a stacked checklist, per Braun,
 *  Strunk, Sasso & Cooper (2015), Behaviour Research and Therapy. Only the FIRST matched distortion is
 *  surfaced as the question — the rest stay unmentioned this turn rather than piling on. */
export function distortionSteer(matches: DistortionMatch[]): string {
  if (matches.length === 0) return "";
  const top = matches[0];
  return [
    "GENTLE NOTICE — their message touched a thinking pattern common under stress (hold lightly, never as a verdict).",
    "VALIDATE the feeling first, in your own words, before anything else.",
    `Only after they feel heard, you may offer AT MOST ONE gentle question to test the thought — never stack more than one, even if several patterns are present: "${top.label}": "${top.phrase}" → ${top.question}`,
  ].join("\n");
}

export type SafeSpotResult =
  | { ok: true; matches: DistortionMatch[] }
  | { ok: false; reason: "crisis" };

/**
 * §9-gated distortion spotting. If the text reads as a crisis disclosure, we surface crisis help instead
 * of reframing — never "spot a distortion" on a suicidal disclosure. Hold lightly, never a verdict.
 */
export function safeSpotDistortions(text: string): SafeSpotResult {
  if (scanForCrisis(text)) return { ok: false, reason: "crisis" };
  return { ok: true, matches: spotDistortions(text) };
}
