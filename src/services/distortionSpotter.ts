import { scanForCrisis } from "../safety";

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
      /\b(they (all )?think i('?m| am) (stupid|incompetent|a failure|useless|annoying|pathetic)|everyone (is judging|thinks|knows)|everyone hates (?:me|us)\b|she thinks i('?m)|he thinks i('?m)|they must think)\b/i,
      // Gap-tolerant: adverbs between subject and verb, object must be me/us so "everyone hates
      // the policy" stays clean (2026-07-12: "everyone secretly hates me" evaded adjacency form).
      /\b(everyone|everybody|they all|all of them) (?:\w+ ){0,2}(hates?|despises?|is judging|are judging|thinks? (?:i|the worst of)) (?:me|us)\b/i,
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
      /\bi('?m| am) (?!not\b|never\b|no longer\b|hardly\b|afraid of\b|scared of\b)(?:\w+ ){0,2}(?:a |an )?(?:complete |total |utter |absolute |massive |huge |worthless |useless )?(failure|idiot|loser|burden|mess|disappointment)\b/i,
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

function normalize(text: string): string {
  return text.toLowerCase().replace(/['\u2019]/g, "'").replace(/\s+/g, " ").trim();
}

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

export function distortionSteer(matches: DistortionMatch[]): string {
  if (matches.length === 0) return "";
  const suggestions = matches.map((m) => `- ${m.label}: "${m.phrase}" → ${m.question}`);
  return ["GENTLE NOTICE — you spotted some thinking patterns (hold lightly, never as a verdict):", ...suggestions].join("\n");
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
