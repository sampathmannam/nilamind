# Orb affect accent — clinician report v2 (per-report opt-in)

Status: approved by user (revised post two rounds of Fable design review), ready for implementation planning
Date: 2026-07-19
Relationship to prior specs: [2026-07-19-orb-affect-accent-design.md](2026-07-19-orb-affect-accent-design.md)
(Phase 1) rejected any clinician-report exposure outright — provenance, not formatting. This spec is
the "future design pass" that rejection explicitly allowed for, conditioned on per-report opt-in,
exact-sentence preview, in-prose attribution, and a minimum-data floor. [2026-07-19-orb-affect-accent-
phase2-design.md](2026-07-19-orb-affect-accent-phase2-design.md) built the day-bucketed history
(`chatAffect.ts::recentAffectDays`) this spec reads from.

## Problem

The clinician-facing report (`clinicianReport.ts`, generated from `YourDataScreen.tsx`) is otherwise
built entirely from self-report or validated/transparent computation (PHQ-9/GAD-7, WHO-5, Pearson
correlations over logged data). The orb affect accent's valence/arousal signal is categorically
weaker evidence — a bootstrap head trained on 55 synthetic examples, 66-74% directional accuracy on a
20-example held-out set — and Fable's Phase 1 review rejected including it in that document on
provenance grounds: a machine inference silently read as equivalent to the user's own self-report, in
a document a psychiatrist uses to make decisions. This spec designs the only form that rejection left
open.

## Key finding that bounds this design

**This feature is dark in production today and will remain so after this spec ships.** Neither
`setAffectAccentEnabled` (Phase 1) nor `setAffectAccentPersistenceEnabled` (Phase 2) is ever set to
`true` outside tests — `main.tsx` wires the embedder but leaves both flags off, pending their own
on-device verification passes. `recentAffectDays()` therefore returns `[]` in production right now, so
every function this spec adds returns `null`/renders nothing until *both* upstream flags are flipped
first (their own, separate, already-planned decisions — not part of this spec). Designing and
implementing ahead of that is fine — it's the same "earn your way in behind flags" sequencing Phase 1
committed to — but it means this spec inherits the accuracy ceiling from Phase 1/2 unchanged: the
underlying head has not gotten more validated. The vocabulary constraints below (Design §1) exist
specifically because of that, and only relax if a real held-out evaluation lands later.

## Constraints (carried forward, some revised per this review)

- **Per-report opt-in, not a standing preference.** The toggle resets to off every time the report
  card is viewed — a persisted "always include this" setting is exactly the failure mode the original
  rejection was written against (a forgotten flag silently injecting unvalidated inferences into
  clinical documents months after the decision).
- **Freeze-at-consent, not recompute-at-export, and frozen from a fresh call — not a stale render
  value (revised per a second Fable review round; the first draft only half-closed this).** The
  previewed sentence and the exported sentence must be the *same object*, captured the instant the
  toggle turns on. Two distinct failure modes had to be closed here, not one: (a) computing the
  sentence live at preview time and again at export time lets the two drift (the user keeps chatting,
  midnight rolls a day out of the window, or they change the report period after toggling on); (b)
  freezing from a value that was merely computed at the component's *last render* (rather than at the
  moment of the click itself) leaves an unbounded staleness window on an idle screen — long enough for
  a day to age out of the window between render and click, meaning the frozen object could describe
  data the floor would no longer accept. The fix for both: the toggle handler itself calls
  `computeConversationToneSummary` fresh, at click time, and freezes *that* result (handling the case
  where it comes back `null`) — never the value sitting in a render-scoped variable. This is the
  **inverse** of `nilaContributions.ts`'s own safeguard (that flow re-derives at confirm-time
  specifically to prevent tampering) — the UI shape is borrowed from that flow, the semantics are not;
  see Design §3.
- **Coarse vocabulary, closed at the verb slot — no free text, no raw numbers, no direction claims
  that the math doesn't back.** The generating function fills a fixed template from a small,
  spec-enumerated set of verb phrases, never model-generated prose, precisely because the underlying
  signal is unvalidated (see Key finding above). Critically, "trended X" is not just gated by having
  enough days — it must be backed by an actual computed direction (a first-half-vs-second-half
  comparison clearing a threshold), or the day-count gate alone would let a flat, unchanging run of
  negative days get labeled a "trend" — precisely the word a clinician will weight most heavily. See
  Design §1.
- **The section always renders last** in the plain-text report — after every other section, including
  the "Enhanced Phenomenological Summary" block — as a deliberate, testable de-emphasis signal in a
  document where every section otherwise looks identical.
- **No crisis-exclusion gate needed.** Unlike `nilaContributions.ts`'s donation flow, the source data
  here is valence/arousal aggregates, never chat content — nothing to leak. A difficult period
  correctly producing "mostly difficult" is the feature working as intended.
- **The `clinicianPdf.ts` de-emphasized rendering is explicitly deferred** — see Explicitly out of
  scope. This spec covers the plain-text builder, the data layer, and the UI only.

## Design

### 1. `chatAffect.ts` — `computeConversationToneSummary`, a closed-vocabulary pure function

```ts
export interface ConversationToneSummary {
  text: string;
  daysUsed: number;
  windowDays: number;
}

// Below this many distinct days, only LEVEL language is honest ("was mostly difficult") — a
// trajectory claim ("trended difficult") implies more points than 3-4 scattered days can support,
// and "trend" is precisely the word a clinician will weight most heavily.
const TRAJECTORY_MIN_DAYS = 5;
// A minimum total-reading floor alongside the day-count floor: three days of count:1 (one turn each)
// would otherwise clear a day-count-only floor on three total model readings from a head that's wrong
// roughly 1 time in 3-4.
const MIN_TOTAL_READINGS = 10;
// Minimum gap between the older and newer half's mean valence before "trended X" is justified — day
// count alone is a NECESSARY condition for trajectory language, never a SUFFICIENT one: a flat run of
// uniformly negative days at 5+ distinct days is a level, not a trend, and must render as "was mostly
// difficult", not "trended difficult".
const DIRECTION_THRESHOLD = 0.15;

export function computeConversationToneSummary(
  periodDays: number,
  now: number = Date.now()
): ConversationToneSummary | null {
  const windowDays = Math.min(periodDays, 30); // chatAffect.ts's own 30-day retention cap
  const days = recentAffectDays(windowDays, now); // most-recent-first, per recentAffectDays's own contract
  const floorDays = Math.max(3, Math.ceil(windowDays * 0.3));
  const totalReadings = days.reduce((s, d) => s + d.count, 0);
  if (days.length < floorDays || totalReadings < MIN_TOTAL_READINGS) return null;

  // Deliberately unweighted by `count` — a 1-turn day and a 20-turn day count equally toward the
  // level. Day-level equal weighting (not reading-level) is the intended aggregation; do not "fix"
  // this into a count-weighted average.
  const avgValence = days.reduce((s, d) => s + d.valence, 0) / days.length;
  const level = avgValence <= -0.2 ? "difficult" : avgValence >= 0.2 ? "positive" : "mixed";

  // Real direction check: split chronologically (oldest half vs newest half) and compare means.
  // recentAffectDays returns most-recent-first, so reverse before halving.
  const chronological = [...days].reverse();
  const mid = Math.floor(chronological.length / 2);
  const olderHalf = chronological.slice(0, mid);
  const newerHalf = chronological.slice(mid);
  const olderAvg = olderHalf.reduce((s, d) => s + d.valence, 0) / olderHalf.length;
  const newerAvg = newerHalf.reduce((s, d) => s + d.valence, 0) / newerHalf.length;
  const hasDirection = days.length >= TRAJECTORY_MIN_DAYS && Math.abs(newerAvg - olderAvg) >= DIRECTION_THRESHOLD;

  // "mixed" never takes trajectory language — a near-zero average produced by real volatility (e.g.
  // swinging from very positive to very negative) would misreport as "stayed mixed" if trajectory
  // wording applied here; "was mixed" is the only phrase this level ever emits.
  const verb =
    level === "mixed"
      ? "was mixed"
      : (hasDirection ? `trended ${level}` : `was mostly ${level}`);

  const capNote = periodDays > 30
    ? " (Conversation-tone history is kept for 30 days, so this covers the most recent 30 only.)"
    : "";

  const text =
    `Model estimate — ${days.length} days of conversation across the last ${windowDays} days: ${verb}. ` +
    `This is an automatic tone estimate from the app's on-device model, not something the patient ` +
    `explicitly told the app, and it is not a clinically validated measure. If this conflicts with ` +
    `other self-reported data in this summary, trust the self-reported data.${capNote}`;

  return { text, daysUsed: days.length, windowDays };
}
```

Notes on the specific choices:
- **The qualifier ("Model estimate —") opens the data line itself**, not only the section header/note
  — a clinician skimming and reading only the first line of a section still gets the provenance.
- **"{daysUsed} days of conversation across the last {windowDays} days"**, never "last N days" alone —
  `recentAffectDays` is sparse (days without chat produce no entry), so 9 scattered days out of 30
  rendered as "last 9 days" would misstate recency as a different, more alarming clinical claim
  (recent deterioration vs. a diffuse pattern over a month).
- **Closed verb slot inside a fixed template — five possible verbs, not free text.** `"trended
  difficult"`, `"trended positive"`, `"was mostly difficult"`, `"was mostly positive"`, `"was mixed"`.
  The *verb* is drawn from this closed set; the surrounding template also interpolates `{daysUsed}`,
  `{windowDays}`, and the conditional cap note, so the full returned string is not itself a five-value
  enumeration — it's a fixed template with a closed verb slot plus those three known variables. Tests
  assert the full text against that template shape with the verb constrained to the closed set, not
  against a flat list of five/six literal complete strings (Testing, below).
- **No accuracy number anywhere in the text** — "not a clinically validated measure" states the
  limitation; quoting the actual 66-74% figure would read as false precision (a number from a
  20-example gold set dressed up as validation) in a document meant to inform clinical judgment.

### 2. `clinicianReport.ts` — new field, rendered last, contract stated on the field itself

```ts
// In ClinicianReportInput:
  /**
   * Orb affect accent v2 — a machine-inferred conversation-tone estimate. Populated ONLY from a
   * user-previewed, per-generation opt-in captured at toggle-time on YourDataScreen.tsx (see
   * docs/superpowers/specs/2026-07-19-orb-affect-accent-clinician-report-design.md §3) — NEVER from a
   * stored preference, and NEVER recomputed after the user has seen the previewed text. The caller is
   * responsible for passing the frozen ConversationToneSummary object verbatim.
   */
  conversationTone?: { text: string; daysUsed: number; windowDays: number };
```

In `buildClinicianReport`, insert immediately before the final `lines.push(SEPARATOR); lines.push(DISCLAIMER);` (i.e., after every other section, including "Enhanced Phenomenological Summary"):

```ts
  // Orb affect accent v2 — machine-inferred conversation tone. Always rendered LAST, deliberately
  // positioned as the least-emphasized section in a report that's otherwise entirely self-report or
  // validated instruments. Vocabulary is deliberately coarse (see ConversationToneSummary's own doc
  // comment) because the underlying signal is unvalidated.
  if (input.conversationTone) {
    lines.push("Conversation Tone (automatic estimate — see note)");
    lines.push(`  ${input.conversationTone.text}`);
    lines.push("");
  }
```

`buildClinicianReport` itself carries no opt-in/consent logic — the field's presence on the input *is*
the consent signal, and the doc comment above states that contract so it can't silently drift.

### 3. UI — `YourDataScreen.tsx`, inline on the existing report card, frozen at toggle-time

```ts
const [toneOptIn, setToneOptIn] = useState<ConversationToneSummary | null>(null); // null = not included
// Live read, used ONLY to decide whether the toggle renders at all — never frozen directly from this
// variable (see the toggle handler below; freezing from a render-scoped value, rather than a fresh
// call at the moment of the click, was a real gap caught in review — see Constraints).
const toneAvailable = computeConversationToneSummary(reportPeriod);

function handlePeriodChange(days: 7 | 30 | 90) {
  setReportPeriod(days);
  setToneOptIn(null); // SYNCHRONOUS reset in the same handler — not a useEffect, which would leave one
                       // paint frame where the old period's frozen preview is still on screen and
                       // exportable under the newly-selected period.
}

function handleToneToggle(checked: boolean) {
  if (!checked) {
    setToneOptIn(null);
    return;
  }
  // Fresh call AT CLICK TIME — not toneAvailable, which may be stale if the screen has sat idle since
  // its last render (a day can age out of the window in that gap). May legitimately come back null if
  // the data aged below the floor between render and click; in that case nothing freezes and the
  // toggle/preview simply don't turn on.
  const frozen = computeConversationToneSummary(reportPeriod);
  setToneOptIn(frozen);
}
```

- If `toneAvailable` is `null` (below the floor, or either upstream flag is off): no toggle renders at
  all — nothing to opt into.
- If `toneAvailable` is non-null and `toneOptIn` is `null`: an unchecked toggle appears below the
  existing period selector: **"Include an automatic conversation-tone estimate"**. Checking it calls
  `handleToneToggle(true)` above and opens a **non-collapsible** preview card, positioned between the
  toggle and the export button, showing `toneOptIn.text` verbatim (the identical string that will be
  exported — same object, not a re-rendering of it).
- Unchecking sets `toneOptIn = null` again (collapses the preview; nothing frozen, nothing exported).
  Re-checking re-freezes a fresh live read at that new instant.
- At export time, `conversationTone: toneOptIn ?? undefined` is passed into `ClinicianReportInput` —
  the **frozen** value. `handleExportClinicianPdf` never calls `computeConversationToneSummary` a
  second time.
- **No confirmation modal.** A "yes I'm sure" dialog trains reflexive clicking more than it prevents
  it; the non-collapsible preview sitting directly in the export flow (physically requiring a scroll
  past the exact sentence) carries the actual safeguard.
- The `nilaContributions.ts` donation-preview pattern is cited here as **UI shape only** — its
  re-derivation-at-confirm safeguard is the opposite of what this flow needs (see Constraints) and
  must not be copied along with the visual pattern.

## Testing

- `chatAffect.test.ts`: `computeConversationToneSummary` — floor scaling (`floorDays` for a 7-day vs.
  30-day window); the `MIN_TOTAL_READINGS` floor rejecting several `count: 1` days even when the
  day-count floor is cleared; the direction-check boundary — a genuinely worsening run of days (older
  half clearly less negative than newer half, gap ≥ `DIRECTION_THRESHOLD`, at ≥5 days) produces
  `"trended difficult"`, while a *flat* run of uniformly negative days at the same day count produces
  `"was mostly difficult"` (this is the case the first draft got wrong — assert it explicitly, not just
  the day-count boundary); `"mixed"` never emits `"stayed mixed"` or any trajectory-flavored phrase,
  only `"was mixed"`, even when a direction is detected (the swinging-not-flat case); the 30-day cap
  note appearing only when `periodDays > 30`; returns `null` when either upstream flag is disabled
  (already covered structurally by `recentAffectDays` itself, re-asserted here at this function's own
  boundary); **a template-shape test** asserting the full returned string matches the fixed template
  with the verb constrained to the five-item closed set — not a flat enumeration of complete literal
  strings, since the template also interpolates `daysUsed`/`windowDays`/the cap note (see Design §1).
- `clinicianReport.test.ts`: the section appears only when `input.conversationTone` is passed; a
  dedicated **ordering test** asserting the section's line index is strictly after every other
  section's (not just presence); the rendered text contains the attribution + self-report-wins +
  not-clinically-validated sentences verbatim; never contains a raw numeric valence/arousal value or
  the model's accuracy figure.
- New tests for the UI logic (co-located with or adjacent to `YourDataScreen`'s existing tests, if any
  exist — otherwise a focused new test file):
  - Toggling on calls `computeConversationToneSummary` fresh and freezes *that* result into `toneOptIn`
    — not a stale `toneAvailable` render value.
  - **The null-at-click race**: if a fresh call at click-time returns `null` (data aged below the floor
    since the component's last render), the toggle does not turn on and nothing is frozen. This test
    only makes sense given the click-time-fresh-call fix above, and locks it in as a regression guard.
  - Changing `reportPeriod` after toggling on resets `toneOptIn` to `null` synchronously, in the same
    handler that changes the period — not via an effect that could leave a stale frozen preview
    on-screen for one frame under the new period.
  - Unchecking the toggle, then exporting, omits `conversationTone` from the resulting
    `ClinicianReportInput` entirely (the presence test in `clinicianReport.test.ts` covers the
    builder's own on-path; this covers the UI's off-path).
  - The value passed to `ClinicianReportInput` at export time is reference-equal to what was previewed,
    not a fresh computation.
  - **Never persisted**: a test asserting the opt-in state is never written to `secureLocal` or
    `localStorage` under any key — the `useState`-only implementation makes this true today; the test
    keeps a future refactor from quietly making it a standing preference.

## Rollout

No new flag. This is gated entirely by the two existing flags' current off-by-default state:
`recentAffectDays()` (Phase 2) already returns `[]` whenever `setAffectAccentPersistenceEnabled` is
`false`, which makes `computeConversationToneSummary` return `null`, which makes the entire toggle/UI
not render. Nothing in this spec changes behavior until both Phase 1's and Phase 2's flags are flipped
on a real device — decisions this spec does not make.

## Explicitly out of scope

- **`clinicianPdf.ts`'s de-emphasized (dashed-border/muted-italic) visual treatment specifically.**
  `buildClinicianReport` has exactly one production caller — `clinicianPdf.ts:283`, via
  `splitReportText`/`renderBody` — so this section reaches the PDF, and therefore the clinician, from
  day one; it is not confined to some unused plain-text path. What's deferred is narrower than "PDF
  support": the section's *position* (always last) and its *in-prose attribution* (the "Model
  estimate —" qualifier, the not-validated sentence, self-report-wins) both survive into the PDF
  correctly, because `splitReportText` preserves line order and the text is carried verbatim — the
  ordering test in `clinicianReport.test.ts` verifies this for the PDF too, transitively. Only the
  `drawMutedNote` dashed-box/muted-italic *styling* `clinicianPdf.ts` already uses for its hand-drawn
  chart-dashboard sections is missing; without it, this section gets the same header styling as every
  validated section in that document. Honest-but-unstylized, not absent, not misattributed — but a real
  gap worth closing. A follow-up spec should extract the section from the generic body text and render
  it via `drawMutedNote`, positioned after everything else in the PDF too, before this feature is
  considered fully de-emphasized end-to-end.
- Flipping `setAffectAccentEnabled` or `setAffectAccentPersistenceEnabled` — both remain out of this
  spec's scope, gated on their own device-verification passes.
- A confirmation modal or any second consent step beyond the non-collapsible preview.
- Persisting the toggle as a standing preference, in any form.
- Quoting the model's held-out accuracy figure anywhere in the report text.
- Trajectory language below `TRAJECTORY_MIN_DAYS` (5) — level-only language is the permanent floor for
  low-data cases, not a temporary placeholder.
- Revocability/withdrawal of an already-exported report — out of scope by nature (a PDF handed to a
  clinician is irrevocable the moment it leaves the device; the entire consent load is carried by the
  preview step before export, not by any after-the-fact mechanism).
