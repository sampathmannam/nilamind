# Quiet Room Shell — Design Spec

Date: 2026-07-19
Sub-project 1 of 5 in the full-app design revamp (see "Revamp sequence" below).

## Problem statement

The user asked for a full visual revamp of every screen in nilamind (31 screens). That's too large for one spec, so it's decomposed into five sequential sub-projects. This spec covers only the first: the **navigation shell** — because the chosen direction changes the app's structural skeleton, and every other sub-project has to plug into it.

Two directions were compared (mockups in `.superpowers/brainstorm/`): (A) a bold reimagining — presence-first, orb-as-nav, no tab bar (the "Quiet Room" concept first mocked up 2026-07-18) — vs (B) deepening the current, already-polished 4-tab IA (Nila·Today·Tools·You). The user chose **A**.

This is a deliberate reopening of a decision this project previously closed: the 2026-07-18 re-architecture declared nav "sealed, not migrated" (`nav.contract.test.ts`), on the judgment that a nav rewrite had no bug-class payoff on a working, device-verified, §9-adjacent surface. That judgment stands for the *existing* IA. This spec doesn't violate it — the legacy path stays completely untouched and its contract test keeps passing unmodified; a new, separate, flagged shell is added alongside it.

## Non-negotiable constraint

Crisis access (today: a persistent Help affordance reachable from all 4 tabs, opening `CrisisOverlay`) and the §9 hardware-back-during-crisis routing must not regress in the new shell. This is enforced by a new contract test (see Testing), not left to convention.

## Revamp sequence (context, not all in this spec)

1. **Shell & navigation foundation** — this spec
2. Core daily scenes — Talk, Check-in, Breathe, You (content redesign within the shell)
3. Capture & tool screens — journal, thought record, safety plan, assessments, etc., reskinned
4. Support & settings screens
5. §9 crisis-critical surfaces, final device-verified pass

## In scope

### Scene set

Five scenes in a swipeable ring, dot-indicator navigation, orb always present as the anchor:

**Presence** (default/idle) ↔ **Talk** ↔ **Check-in** ↔ **Breathe** ↔ **You** (= Toolkit gateway)

### Toolkit scene

The ~21 screens that don't fit the ring (journal, thought record, problem solving, values-to-action, safety plan, assessments, episode tools, settings, legal, caregiver, model setup, about, your data, etc.) are reached via **You**, which opens a searchable/categorized list — the same access pattern as today's Tools tab, just re-homed. Exact grouping/IA of this list is deferred to sub-project 3; this spec only establishes that the gateway exists and where it lives.

### Component tree (new, additive — nothing existing is modified)

```
src/shell/
  QuietRoomShell.tsx       — root: active scene index, swipe state, theme
  scenes/
    PresenceScene.tsx      — orb, ambient canvas, idle state
    TalkScene.tsx          — presentational host for existing chat logic
    CheckInScene.tsx       — presentational host for existing check-in flow
    BreatheScene.tsx       — presentational host for existing breathing flow
    ToolkitScene.tsx       — searchable gateway list
  components/
    Orb.tsx                — breathing/tappable orb, themeable
    SceneRing.tsx           — swipe/dot navigation
    HelpPill.tsx            — pinned crisis-access affordance
  theme/
    dayNight.ts             — Night/Daybreak tokens, extends the Phase 0 semantic token layer
```

`TalkScene`/`CheckInScene`/`BreatheScene` are presentational hosts, not reimplementations: they mount the same hooks the current screens already use (`useCrisisGate`, `useNudges`, `useCheckinGate`, `useMessageFeedback`, the `secureData` read/write layer). No new business logic, no new state management beyond shell-local UI state (active scene, swipe position, theme).

**This spec's scenes render functionally real but visually minimal content** — e.g. `TalkScene` reuses the existing chat UI (message list, input, quick actions) inside the new scene frame, with only enough styling to be usable, not the finished visual language. This is what makes the rollout gate below meaningful: §9 crisis routing can be genuinely device-verified through this spec alone, without waiting on sub-project 2's visual redesign of the same scenes.

### Flag mechanism

Build-time, dev-only flag `VITE_QUIET_ROOM_SHELL`, checked once in `App.tsx`:

```tsx
{quietRoomEnabled ? <QuietRoomShell/> : <ExistingTabRoot/>}
```

`ExistingTabRoot` is today's `App.tsx` body extracted verbatim — zero behavior change to the legacy path.

### Crisis invariant enforcement

`src/shell/shell.boundary.test.ts` (same pattern as `nav.contract.test.ts` / `safety.boundary.test.ts`): fails if any file under `src/shell/scenes/` renders without also rendering `<HelpPill/>`. Static import-graph check, allowlist-based. Makes "Help on every scene" a pinned contract that a future 6th scene can't silently violate.

`HelpPill` wraps the existing crisis-open path (`openCrisis`/`CrisisOverlay`) — no new crisis logic, just a new presentational affordance over logic that's already tested.

Shell-local refs (`hadCrisisRef`, `crisisPendingRef`) are created once at `QuietRoomShell` root and passed down as the same single ref objects throughout — per the existing §9 lift lessons (two ref instances = silent always-false gate).

### Rollout plan

1. Dev-only build flag; user dogfoods on-device.
2. Once Presence, Talk (§9-critical), and Toolkit are device-verified — hardware back button, crisis takeover mid-scene, full golden §9 suite green — promote to a Settings toggle ("Try the new look," opt-in, off by default).
3. No default-flip decision in this spec; that's a future call once real usage/feedback exists.

### Testing strategy

- Golden §9 suite (currently 401 tests) must stay green with the flag OFF (untouched legacy path) and pass again with the flag ON once `TalkScene` is wired to real crisis routing.
- `nav.contract.test.ts` unmodified and still green (legacy path untouched).
- New `shell.boundary.test.ts` (crisis-pill-on-every-scene contract).
- Per-scene characterization tests, same style as existing `CaptureSheets.test.tsx` / `NudgeRail.test.tsx`.
- No existing test file is modified by this spec.

## Out of scope (deferred to later sub-projects)

- Final visual language (colors/type/motion) beyond what's shown in the approved mockup — this spec fixes structure, not finish.
- Toolkit's internal grouping/IA (illustrative "Skills/Track/More" grouping shown in the mockup is not final).
- Content redesign of Talk/Check-in/Breathe/You scenes (sub-project 2).
- Any change to the legacy tab-based app — it is not touched, only wrapped in a conditional.
- Default-on decision for the new shell.

## Risks called out explicitly

- This reopens a nav surface the project deliberately sealed. Mitigated by keeping the legacy path byte-identical and gating everything behind a dev-only flag until §9 is re-verified.
- `TalkScene` is the highest-risk single piece (crisis routing lives there). It gets built and verified before Check-in/Breathe/You in sub-project 2, not in parallel.
- 21-screen Toolkit gateway is a lot of surface for one list — grouping strategy is explicitly deferred rather than guessed at here.
