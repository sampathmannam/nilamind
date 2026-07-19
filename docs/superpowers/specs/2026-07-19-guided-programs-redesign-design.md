# Guided Programs + Quiet Room visual redesign

Date: 2026-07-19
Status: proposed (decision delegated to and made by Fable 5, per user instruction)

## 1. Goal

Nilamind's structured-protocol library — 21 protocols total, from short micro-protocols
(grounding, gratitude, self-compassion) to full named modules (DBT, ACT, CBT-I,
mindfulness, social rhythm, relapse prevention, behavioral experiments, assertion), all
evidence-cited in `src/services/protocols.ts` and `protocol*.ts` — is real, wired, and
shipped, but under-surfaced. This design
makes it (a) more **discoverable**, (b) more visibly **credible** (evidence citations on
screen, not just in source comments), and (c) confirms the existing **routing** already
meets this project's consent bar — without reopening the sealed nav contract or claiming
any "trained counsellor" capability for Nila herself (hard invariant, unchanged).

Out of scope, explicitly: Nila presenting as credentialed/trained; any live connection,
matching, or booking with a real human counsellor; removing or restructuring existing
Tools-tab entries (that's Approach B, deferred — see §7).

## 2. What already exists (corrected — twice — from initial assumptions)

A codebase read during design turned up more than expected. A first draft of this spec
undercounted the registry (said "8 protocols"); a Fable review pass then read the code
directly and flagged the error — but its own replacement number was itself a partial
count. Verified directly against source, the actual shape is:

- **The live registry (`PROTOCOLS` in `src/services/protocols.ts`) holds 21 protocols,
  not 8.** Two layers exist and both feed the same array: 13 short micro-protocols
  defined inline (`behavioral-activation`, `worry-postponement`, `self-compassion`,
  `sleep-wind-down`, `social-confidence`, `panic-skills`, `cooling-anger`,
  `grounding-anchor`, `sleep-rhythm`, `social-connection`, `gratitude`, `values-action`,
  `intolerance-of-uncertainty`) plus 8 larger named modules imported from their own files
  (`dbt-skills-training`, `act-training`, `assertion-training`, `cbti-sleep`,
  `social-rhythm`, `relapse-prevention`, `mindfulness-practice`, `behavioral-experiments`
  — these are the ones with dedicated `protocolDBT.ts`/`protocolACT.ts`/etc. service
  files, which is what the initial spec draft mistook for the whole registry). All 21 are
  reachable through the same `routeToProtocol`/`startProtocolChat`/`getProtocol` API —
  there is no code-level distinction between "micro" and "named" once routed.
- **Data model already carries evidence**: `Protocol.basis` is a mandatory field on all
  21 — every protocol traces to a citation (e.g. Linehan 2015, Hayes et al. 2011). It is
  not currently rendered anywhere in the UI.
- **Routing already exists and is live**: `protocolOfferCard()` in
  `src/services/protocolChat.ts` matches user chat text against `forConcerns` lexical
  cues — **~451 cue strings total across all 21 protocols** (268 in the 13 inline
  micro-protocols, ~183 more across the 8 named-module files) — and surfaces a
  `ProtocolCard` in `ModeScreen.tsx`. Per `protocolOffer()`'s own doc comment, it offers
  "ONLY when nothing is already active (never interrupt an in-progress program)," fails
  closed on a crisis disclosure (`scanForCrisis` gate), and never auto-starts — the card
  requires an explicit tap (`startProtocolChat`), matching the SENSE→ASK→CONFIRM→ACT
  pattern this project already uses elsewhere. **This is a real, working consent-gated
  suggestion system today.**
- **No dedicated browse/discovery surface exists.** The only ways to reach a protocol are
  (1) get lexically matched in chat, or (2) already know it's under Tools.

So the actual gaps are narrower than "add routing": (1) no hub to browse/start a protocol
deliberately, (2) `basis` never reaches the screen, (3) `forConcerns` coverage across all
21 protocols hasn't been audited for gaps — a meaningfully bigger verification task than
first scoped, given ~451 cues rather than ~22.

## 3. Guided Programs hub (Approach A — additive)

A new screen, `GuidedProgramsScreen.tsx`, added as one new `AuxView` entry
(`"guided_programs"`) in `src/services/nav.ts` — a single deliberate addition to
`KNOWN_AUX_VIEWS`, consistent with what the sealed nav-contract test permits (it freezes
the set against silent additions, not against reviewed ones).

- Lists all 21 protocols as cards: title, one-line plain-language description, step
  count, and a citation line rendered from `Protocol.basis` (e.g. "Based on Linehan, 2015
  — DBT Skills Training"). **21 flat cards is too many for one undifferentiated list** —
  group them. The data gives a natural, non-arbitrary axis for free: the 13 inline
  protocols all run exactly 5 steps ("Quick programs"), the 8 named modules run 5–10 steps
  ("Deeper modules" — DBT, ACT, CBT-I, etc.). Use that two-tier split rather than
  inventing a new concern-domain taxonomy; it's grounded in the actual data shape, not a
  design guess, and keeps `buildToolGroups()`'s existing grouped-sections pattern
  (`toolsRows.ts`) as the visual precedent without duplicating its specific categories.
- Tapping a card calls the same `startProtocolChat(protocolId)` used by the existing chat
  offer flow, then routes to the Nila tab — one start path, not a second parallel one.
- **Already-active protocol — a named, deliberate exception to an existing invariant**:
  `protocolOffer()`'s doc comment states it offers "ONLY when nothing is already active
  (never interrupt an in-progress program)" — but that invariant governs the *passive
  chat-offer* path (Nila unprompted mid-conversation). The hub is a *user-initiated browse*
  path, a different context, so it is allowed to deliberately break that rule for an
  explicit user tap — but must do so visibly, not silently. `protocolProgress.ts` holds
  exactly one active slot (`{protocolId, stepIndex}`); calling `startProtocol` on a new id
  overwrites it, and the old protocol has no saved position to resume from (restarting it
  later begins at step 0 again, same as the existing completed-protocol-restart behavior).
  So tapping a different card while one is active shows a confirm ("Switch from {active
  title}? You'll restart it from the beginning next time.") before calling
  `startProtocolChat`. This is an honest warning, not a save-and-resume promise — building
  real multi-protocol resume is out of scope here.
- Reachable via a new featured card on `DashboardScreen.tsx` (Today), following the
  existing `InsightCard`/`PassiveInsightCard` component pattern already used there for
  other Today-surface cards.
- **Existing Tools-tab entries for protocol-adjacent screens (thought record, safety plan,
  values-to-action, exposure, relapse plan, DBT diary card) are untouched.** The hub is a
  second, more visible front door for the protocol-chat engines specifically — it does not
  duplicate or replace the standalone data-entry screens, which are a different kind of
  tool.

## 4. Citation chips

Extend `ProtocolCard` (`protocolChat.ts`) with a `basis: string` field, populated from
`Protocol.basis`, and render it as a small citation chip:
- In the existing chat offer card (`ModeScreen.tsx`, near the current `protocolCard.label`
  render).
- On every card in the new Guided Programs hub.

This is the évidence-visible-structure priority from the competitor research: fewer than
2% of mental-health apps show robust clinical validation, so a citation the user actually
sees is a rare, real differentiator — not decoration.

## 5. Routing coverage audit

Before shipping, audit `forConcerns` across all 21 protocols (~451 cue strings, see §2)
for gaps AND collisions. This is a verification task against existing code, not new
infrastructure, but is a larger pass than "8 protocols" implied — budget accordingly in
the implementation plan.

**A specific, verified collision to resolve, not just a hypothetical to check for**:
`routeToProtocol()` (`protocols.ts`) scores every protocol by cue-match count and keeps
the first-seen protocol on a tie (`if (score > bestScore)` — strict greater-than, so equal
or lower-scoring later entries never win). `sleep-wind-down` (an inline micro-protocol, 28
cues) and `cbti-sleep` (the evidence-heavier CBT-I module, 35 cues) share **24 cues**
verbatim — the two protocols' `forConcerns` arrays are near-duplicates. Because
`sleep-wind-down` sits earlier in `PROTOCOLS` (inline, near the top) and `cbti-sleep` is
appended later (one of the 8 imported modules), a tie or a `sleep-wind-down`-favoring
score routes sleep complaints to the shorter micro-protocol instead of the cited CBT-I
module on a meaningful share of real messages — undermining exactly the
evidence-credibility goal this whole feature exists for. `assertion-training` and
`dbt-skills-training` share a smaller 4-cue overlap, lower priority.

Output: a pass/fail + collision table per protocol. Fix the sleep pair specifically
(disambiguate cues, reorder, or make `routeToProtocol` prefer higher-evidence/longer
protocols on a tie — pick one, don't leave it to insertion-order accident) as part of this
change, not a follow-up.

## 6. Visual language: Quiet Room as shell, not a fork

The hub and citation chips ship now, styled in Nilamind's current design system (lavender
palette, Lora headings) — they do **not** wait on the larger Quiet Room orb-navigation
re-architecture, which remains a separate, not-yet-phased effort per prior planning.
However: the hub's visual treatment (card shape, iconography, citation-chip styling)
should draw from the already-prototyped Quiet Room screens (built in Claude Design) so
that when/if the orb-shell navigation ships later, Guided Programs slots into it as the
orb's primary "depth" surface rather than needing a second redesign. Concretely: use
Quiet Room's typography and card treatment now; do not build the hub against the current
hard tab bar in a way that would need to be re-architected to fit inside the orb model
later (e.g. keep navigation-in/out of the hub to a single push/pop, no tab-bar-specific
assumptions baked into the screen).

## 7. Explicitly deferred

- **Approach B (Tools-tab consolidation)**: removing/redirecting existing Tools entries
  into the hub. Matches the "Phase 3 nav/overlay unification" work already explicitly
  paused by this project's own prior review. Revisit only after instrumenting hub vs.
  Tools-tab traffic for ~2 releases — consolidation should be an evidence-backed decision,
  not a redesign casualty.
- **Full Quiet Room orb-navigation implementation**: the ambient-presence nav replacing
  the tab bar. Prototyped visually, not phased into engineering work yet. This design
  prepares Guided Programs to slot into it later without assuming it ships first.
- **Any human-counsellor connection feature** (matching, booking, messaging): out of
  scope for this design entirely; would require revisiting the "nothing leaves the
  device" invariant, which is not this design's call to make.

## 8. Testing

- `nav.contract.test.ts` (**not** `nav.test.ts`/`navStore.test.ts` — that's where the
  actual frozen golden set of `TAB_TARGETS`/`KNOWN_AUX_VIEWS` lives, per its own header
  comment: "seal, don't migrate... any add/remove is then a deliberate, reviewed edit").
  Add `"guided_programs"` to the golden set and confirm it round-trips through
  `resolveNavTarget`. `nav.test.ts` may also want a route-level spot-check alongside its
  existing per-route cases, but the contract file is the one that will actually fail
  without this change.
- New `GuidedProgramsScreen.test.tsx`: renders all 21 protocols across their groups (§3),
  citation text present per card, tap invokes `startProtocolChat` with the correct id,
  switch-confirmation shown when a different protocol is already active.
- `protocolChat.test.ts`: extend for the new `basis` field on `ProtocolCard`.
- Routing audit (§5) output reviewed as part of this change, not shipped silently.

## 9. Build order

1. `ProtocolCard.basis` field + citation chip rendering in the existing chat offer card
   (smallest, lowest-risk slice, ships the credibility win immediately).
2. Routing coverage audit (§5), **including the sleep-pair collision fix** — done before
   the hub, not after: the collision fix may change how `sleep-wind-down` and `cbti-sleep`
   are distinguished/labeled, which the hub's card list and grouping (§3) need to reflect
   correctly from the start rather than being built against a since-changed routing layer.
3. `GuidedProgramsScreen.tsx` (Quick programs / Deeper modules grouping, §3) +
   `"guided_programs"` nav entry + tests.
4. Today entry card (`DashboardScreen.tsx`).
