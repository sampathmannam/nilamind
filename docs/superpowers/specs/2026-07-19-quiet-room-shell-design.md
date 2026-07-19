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

**Reachability contract:** `ToolkitScene`'s list is checked against `KNOWN_AUX_VIEWS` (`nav.contract.test.ts`) so every allowlisted screen is provably reachable from the new shell — the same class of protection the legacy nav already has, extended to the new gateway rather than assumed.

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

**Corrected after design review (see "Design review" below): `TalkScene` hosts `<ModeScreen>` wholesale**, wired through its existing 11 nav props (`onOpenSettings`, `onOpenCrisis`, `onOpenDashboard`, `onOpenMedication`, `onOpenGrounding`, `onOpenDiary`, `onOpenReachOut`, `onOpenWindDown`, `activeCapture`, `onOpenCapture`, `onCloseCapture`), not a fresh composition of its hooks. `messages` state is explicitly documented in `useCrisisGate.ts` as un-liftable (cycle with `useNudges`/selector/protocol/render), so "same hooks, presentational" was never achievable for chat — attempting it would silently re-open the `useChatController` extraction that Phase 4 deliberately declined. `TalkScene` is a thin frame around the real `ModeScreen`, nothing more.

`BreatheScene` likely follows the same "host the existing screen wholesale" pattern (`BreathingScreen` already takes a simple `onClose` prop). `CheckInScene` is **not yet verified safe** to build as a separate hook-composed scene: `useCheckinGate`'s handlers (`handleCheckinLogged`/`handleCheckinSkip`) append synthesized turns directly into `ModeScreen`'s chat state, and `NilaCheckIn` is currently only ever rendered from inside `ModeScreen` — the same class of entanglement Talk had. Resolving this (host wholesale like Talk, or a genuine extraction) is deferred to sub-project 2's design, not decided here.

**This spec's scenes render functionally real but visually minimal content** where hosting is confirmed (Talk, Breathe) — reusing the existing UI inside the new scene frame with only enough styling to be usable, not the finished visual language. This is what makes the rollout gate below meaningful for those scenes: §9 crisis routing can be genuinely device-verified through this spec alone. Check-in's device-verification readiness depends on how sub-project 2 resolves its entanglement.

**Mount policy:** scenes do not unmount on swipe — the ring translates between mounted scenes, it does not conditionally render them. This matters most for Talk: a swipeable ring makes accidental mid-stream unmount far easier than a deliberate tab tap, and this app already has a known chat-lost-on-tab-switch bug class. Swiping is disabled while `CrisisOverlay` is open (crisis takeover freezes the ring).

### Flag mechanism

**Corrected after design review:** `AppShell` (`App.tsx:187`) is not purely presentational — it owns ~20 app-lifecycle effects with no nav dependency (notification sync, deep-link routing, retention metrics, wake word, pilot-study reminders, the biometric/model-setup/onboarding gates) alongside a handful of genuinely nav-dependent listeners (hardware back button, notification-tap routing via `go(view)`). A naive top-level branch (`<QuietRoomShell/> : <ExistingTabRoot/>`) would silently drop all the lifecycle effects under the flag, or force duplicating them into `QuietRoomShell` — a maintenance trap.

Instead: hoist the nav-independent effects into a shared headless `AppLifecycle` component, rendered once **above** the flag branch. Each shell (legacy `AppShell` and new `QuietRoomShell`) owns only its own nav-dependent listeners:

```tsx
<AppLifecycle>
  {quietRoomEnabled ? <QuietRoomShell/> : <AppShell/>}
</AppLifecycle>
```

This is a real, honest modification to `App.tsx` — not a byte-identical extraction — so it must ship with its own test coverage (effects still fire once, not zero or twice) before either shell is built on top of it. Call out explicitly: while touching this file, fix the pre-existing duplicate-effect bug already present in current `AppShell` — the adaptive-theme effect and `warmVoskStt()` are each registered *twice* (`App.tsx:299-312`/`397-410` and `315`/`413`), running two identical 30-second intervals. Fix this as part of the hoist, not silently carry the duplication into the shared host.

### Crisis invariant enforcement

Two-part test, not one — a static check alone has blind spots (a conditionally-rendered `{!immersive && <HelpPill/>}` or a z-index burial would pass a static import/JSX check while failing at runtime):

1. `src/shell/shell.boundary.test.ts` (same pattern as `nav.contract.test.ts` / `safety.boundary.test.ts`): static check that every file under `src/shell/scenes/` imports and renders `<HelpPill/>` in its JSX. Catches the case of a new scene shipping without the affordance at all.
2. Per-scene runtime render tests (jsdom) asserting an accessible, clickable crisis-help element is actually present in the rendered DOM for every scene — catches the conditional/CSS-hiding cases the static check can't.
3. A back-handler contract test: hardware back while a crisis is active closes the overlay and never exits the app — porting the existing invariant at `App.tsx:322-331` into the new shell's back handler, tested directly rather than left as tribal knowledge.

`HelpPill` wraps the existing crisis-open path (`openCrisis`/`CrisisOverlay`) — no new crisis logic, just a new presentational affordance over logic that's already tested.

**Corrected after design review:** since `TalkScene` hosts `<ModeScreen>` wholesale rather than recomposing its hooks, `hadCrisisRef`/`crisisPendingRef` are **not** shell-local — they stay exactly where they are today, owned inside `ModeScreen`, unchanged. `QuietRoomShell` does not create or touch these refs at all. (This also removes a class of risk: there is only ever one `ModeScreen` instance, so the "exactly one ref object" invariant from the original §9 lift is automatically preserved, not something the shell has to re-establish.)

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

## Design review (Fable, 2026-07-19)

This spec was reviewed by Fable (the project's design authority) before implementation planning. Its citations (`App.tsx` line ranges, `useCrisisGate.ts`'s messages-cycle comment, `nav.contract.test.ts`'s `KNOWN_AUX_VIEWS`) were independently verified against the actual source, including one additional confirmed finding not in the original ask: `CheckInScene` has the same chat-state entanglement risk `TalkScene` had, since `useCheckinGate`'s handlers write directly into `ModeScreen`'s message state and `NilaCheckIn` is currently only ever rendered from inside `ModeScreen`. Five corrections came out of this pass and are folded into the sections above: the `AppShell` lifecycle-effects hoist (flag mechanism), `TalkScene` = hosted `ModeScreen` not recomposed hooks, the two-part crisis-invariant test (static + runtime + back-handler), the mount-not-unmount policy for scenes, and the `ToolkitScene` reachability contract. It also surfaced a pre-existing, unrelated bug worth fixing opportunistically while `App.tsx` is being touched: the adaptive-theme and `warmVoskStt` effects are each registered twice.

## Risks called out explicitly

- This reopens a nav surface the project deliberately sealed. Mitigated by keeping the legacy `AppShell` behaviorally untouched (only wrapped, not rewritten) and gating everything behind a dev-only flag until §9 is re-verified.
- `TalkScene` is the highest-risk single piece (crisis routing lives there). It gets built and verified before Check-in/Breathe/You in sub-project 2, not in parallel.
- `CheckInScene`'s separability from `ModeScreen` is unresolved by this spec — sub-project 2 must decide between hosting it wholesale (like Talk) or a genuine extraction, and treat it with the same caution Talk received here.
- 21-screen Toolkit gateway is a lot of surface for one list — grouping strategy is explicitly deferred rather than guessed at here.
- The `AppLifecycle` hoist is a real (if small) change to the currently-shipping `App.tsx`, not a zero-risk wrapper — it needs its own test coverage before either shell is built on top of it.
