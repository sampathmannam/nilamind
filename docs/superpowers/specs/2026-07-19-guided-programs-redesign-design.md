# Guided Programs + Quiet Room visual redesign

Date: 2026-07-19
Status: proposed (decision delegated to and made by Fable 5, per user instruction)

## 1. Goal

Nilamind's structured-protocol library (CBT-I, DBT, ACT, MBCT mindfulness, social rhythm,
relapse prevention, behavioral experiments, assertion — all evidence-cited in
`src/services/protocol*.ts`) is real, wired, and shipped, but under-surfaced. This design
makes it (a) more **discoverable**, (b) more visibly **credible** (evidence citations on
screen, not just in source comments), and (c) confirms the existing **routing** already
meets this project's consent bar — without reopening the sealed nav contract or claiming
any "trained counsellor" capability for Nila herself (hard invariant, unchanged).

Out of scope, explicitly: Nila presenting as credentialed/trained; any live connection,
matching, or booking with a real human counsellor; removing or restructuring existing
Tools-tab entries (that's Approach B, deferred — see §7).

## 2. What already exists (corrected from initial assumption)

A codebase read during design turned up more than expected — this changes the shape of
the work from "build routing" to "surface what's already routed":

- **Data model already carries evidence**: `Protocol.basis` (`src/services/protocols.ts`)
  is a mandatory field — every protocol traces to a citation (e.g. Linehan 2015, Hayes et
  al. 2011). It is not currently rendered anywhere in the UI.
- **Routing already exists and is live**: `protocolOfferCard()` in
  `src/services/protocolChat.ts` matches user chat text against each protocol's
  `forConcerns` lexical cues (22 cue entries across the library) and surfaces a
  `ProtocolCard` in `ModeScreen.tsx`. It already fails closed on a crisis disclosure
  (`scanForCrisis` gate) and never auto-starts — the card requires an explicit tap
  (`startProtocolChat`), matching the SENSE→ASK→CONFIRM→ACT pattern this project already
  uses elsewhere. **This is a real, working consent-gated suggestion system today.**
- **No dedicated browse/discovery surface exists.** The only ways to reach a protocol are
  (1) get lexically matched in chat, or (2) already know it's under Tools.

So the actual gaps are narrower than "add routing": (1) no hub to browse/start a protocol
deliberately, (2) `basis` never reaches the screen, (3) routing coverage across all 8
protocols hasn't been audited for gaps.

## 3. Guided Programs hub (Approach A — additive)

A new screen, `GuidedProgramsScreen.tsx`, added as one new `AuxView` entry
(`"guided_programs"`) in `src/services/nav.ts` — a single deliberate addition to
`KNOWN_AUX_VIEWS`, consistent with what the sealed nav-contract test permits (it freezes
the set against silent additions, not against reviewed ones).

- Lists all 8 protocols as cards: title, one-line plain-language description, step count,
  and a citation line rendered from `Protocol.basis` (e.g. "Based on Linehan, 2015 — DBT
  Skills Training").
- Tapping a card calls the same `startProtocolChat(protocolId)` used by the existing chat
  offer flow, then routes to the Nila tab — one start path, not a second parallel one.
- **Already-active protocol**: `protocolProgress.ts` holds exactly one active slot
  (`{protocolId, stepIndex}`) — calling `startProtocol` on a new id overwrites it, and the
  old protocol has no saved position to resume from (restarting it later begins at step 0
  again, same as the existing completed-protocol-restart behavior). So the hub must not
  silently overwrite an in-progress protocol: tapping a different card while one is active
  shows a confirm ("Switch from {active title}? You'll restart it from the beginning next
  time.") before calling `startProtocolChat`. This is an honest warning, not a
  save-and-resume promise — building real multi-protocol resume is out of scope here.
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

Before shipping, audit `forConcerns` across all 8 protocol files for gaps (e.g. does CBT-I
actually get offered on sleep-complaint language today, in practice, not just in theory).
This is a verification task against existing code, not new infrastructure — output is a
short pass/fail table per protocol, with cue additions only where a real gap is found.

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

- `nav.test.ts` / `navStore.test.ts`: extend the golden-set assertions to include
  `"guided_programs"` (the sealed-contract pattern already requires this for any new
  route).
- New `GuidedProgramsScreen.test.tsx`: renders all 8 protocols, citation text present per
  card, tap invokes `startProtocolChat` with the correct id.
- `protocolChat.test.ts`: extend for the new `basis` field on `ProtocolCard`.
- Routing audit (§5) output reviewed as part of this change, not shipped silently.

## 9. Build order

1. `ProtocolCard.basis` field + citation chip rendering in the existing chat offer card
   (smallest, lowest-risk slice, ships the credibility win immediately).
2. Routing coverage audit (§5) — fix any real gaps found.
3. `GuidedProgramsScreen.tsx` + `"guided_programs"` nav entry + tests.
4. Today entry card (`DashboardScreen.tsx`).
