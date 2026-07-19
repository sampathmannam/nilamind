# Quiet Room Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new orb-as-nav navigation shell (5-scene ring: Presence/Talk/Check-in/Breathe/You) behind a dev-only build flag, alongside the existing 4-tab nav which stays completely untouched and green.

**Architecture:** Extract the ~20 nav-independent lifecycle effects and the nav-overlay-rendering JSX (sheets, crisis overlay) out of `AppShell` into two small shared components (`AppLifecycle`, `NavOverlays`) so neither shell has to duplicate them. Build the new shell (`QuietRoomShell`) as a thin, additive tree under `src/shell/` that hosts existing, already-tested screens wholesale (`ModeScreen` for Talk, `BreathingScreen` for Breathe, `ToolsScreen`+`YouScreen` for the Toolkit gateway) rather than recomposing their internal hooks — per the design review, `messages` state cannot be safely lifted out of `ModeScreen`. A single `<HelpPill>` is rendered once at the ring level (not per-scene), which structurally guarantees crisis access on every scene rather than relying on each scene author to remember it.

**Tech Stack:** React 18 + TypeScript, Vite (custom `VITE_QUIET_ROOM_SHELL` env flag), Tailwind v4 (existing semantic token layer — `text-ink`, `bg-page`, `text-accent`, `text-danger`, etc. — reused as-is, no new tokens), Vitest + `@testing-library/react` (jsdom), Capacitor (`@capacitor/app` for hardware back).

## Global Constraints

- The legacy path (`AppShell` when the flag is off/unset) must render byte-identical output to today — verified by running the full existing suite (currently 3,500+ tests, including the golden §9 suite and `nav.contract.test.ts`) unmodified and green after every task.
- `nav.contract.test.ts` and `safety.boundary.test.ts` are never edited by this plan.
- No new business logic is written for crisis handling, chat, check-in, or breathing — every scene hosts an existing, already-tested component or service.
- `VITE_QUIET_ROOM_SHELL` defaults to unset/false — the new shell is unreachable unless a developer explicitly builds with the flag on.
- Follow the existing codebase conventions found during research: relative imports (no path aliases), `@vitest-environment jsdom` pragma + `@testing-library/react` for component tests, `afterEach(cleanup)`, Tailwind semantic-token utility classes (never raw Tailwind color ramps) for any new UI.
- Two implementation-detail refinements beyond the literal spec text, made during planning and documented here for traceability: (1) the spec's `theme/dayNight.ts` file is dropped — the app already has a complete, app-wide dark/light theme system (`src/services/theme.ts`, toggled via a `theme-light` class on `<html>`) that the existing semantic tokens already respond to; the new shell just uses those tokens directly, nothing new to build. (2) `<HelpPill>` is rendered once at the `SceneRing` level instead of once per scene file — this is a strictly stronger structural guarantee than the spec's original "every scene file imports HelpPill" static check (there is nothing for a future scene to forget), and the boundary test in Task 6 checks both the static structure and the runtime DOM presence.
- `CrisisHeaderButton` (`src/components/CrisisHeaderButton.tsx`) already exists and is the app's one "Get help now" affordance — `HelpPill` wraps it rather than inventing new crisis UI.

---

## File Structure

```
src/components/ScreenFallback.tsx    — NEW: extracted skeleton-loading fallback (was a local fn in App.tsx)
src/hooks/useActivateCrisis.ts       — NEW: extracted activateCrisis helper (was a local fn in AppShell)
src/components/AppLifecycle.tsx      — NEW: headless, nav-independent app lifecycle effects
src/components/NavOverlays.tsx       — NEW: crisis overlay + all sheet-based overlays (shared by both shells)
src/App.tsx                          — MODIFIED: strip moved code, add the flag branch
src/shell/components/HelpPill.tsx    — NEW: pinned crisis-access affordance
src/shell/components/Orb.tsx         — NEW: presentational breathing/tappable orb
src/shell/components/SceneRing.tsx   — NEW: swipeable 5-scene container + dot nav + HelpPill
src/shell/scenes/PresenceScene.tsx   — NEW: idle/default scene
src/shell/scenes/TalkScene.tsx       — NEW: thin host for <ModeScreen>
src/shell/scenes/CheckInScene.tsx    — NEW: placeholder stub (real content deferred to sub-project 2)
src/shell/scenes/BreatheScene.tsx    — NEW: thin host for <BreathingScreen>
src/shell/scenes/ToolkitScene.tsx    — NEW: hosts <ToolsScreen> + <YouScreen> wholesale
src/shell/QuietRoomShell.tsx         — NEW: root — composes SceneRing + NavOverlays + hardware back
```

Each new file has one job: `AppLifecycle` and `NavOverlays` are shared infrastructure so neither shell duplicates ~150 lines of App.tsx; each scene file is a thin frame around one existing, already-tested screen; `SceneRing` is the only place that knows about swiping/dots/HelpPill; `QuietRoomShell` is the only place that wires nav state to scene selection.

---

### Task 1: Extract `AppLifecycle` (headless effects) + `useActivateCrisis` + fix the pre-existing duplicate-effect bug

**Files:**
- Create: `src/components/AppLifecycle.tsx`
- Create: `src/hooks/useActivateCrisis.ts`
- Create: `src/components/AppLifecycle.test.tsx`
- Modify: `src/App.tsx:187-413` (remove the moved effects and the local `activateCrisis`, render `<AppLifecycle/>`, adopt `useActivateCrisis`)

**Interfaces:**
- Produces: `AppLifecycle` — a component taking no props, rendering `null`, to be mounted once above the shell branch. `useActivateCrisis(): () => void` — a hook returning a stable callback that suppresses nudges and opens the crisis overlay via the shared nav.

- [ ] **Step 1: Create `src/hooks/useActivateCrisis.ts`**

```tsx
import { useCallback } from "react";
import { useNav } from "../services/navStore";
import { suppressNudgesForCrisis } from "../services/notifications";

// The one place "open the crisis overlay" is defined — both AppShell and the new QuietRoomShell (and
// NavOverlays, for aux screens that can self-trigger a crisis) call this instead of each re-deriving the
// suppress-then-open sequence.
export function useActivateCrisis(): () => void {
  const { openCrisis } = useNav();
  return useCallback(() => {
    void suppressNudgesForCrisis();
    openCrisis();
  }, [openCrisis]);
}
```

- [ ] **Step 2: Create `src/components/AppLifecycle.tsx`**

Move the following effects verbatim from `AppShell` (`src/App.tsx`), deduplicating the two effects that are currently registered twice (adaptive theme: `App.tsx:299-312` and `App.tsx:397-410` are identical — keep one; `warmVoskStt`: `App.tsx:315` and `App.tsx:413` are identical — keep one):

```tsx
import { useEffect } from "react";
import { syncDailyReminders, syncWeeklyDigest, syncWindDownReminder, syncMedicationReminders, syncInsightNotification, syncEmaCheckins, registerNotificationActionTypes } from "../services/notifications";
import { recordFirstOpenToday, recordLastCloseToday } from "../services/autoAnchors";
import { logMedication, loadMedications } from "../services/medicationAdherence";
import { recordAppOpen } from "../services/retentionMetrics";
import { recordPositiveSession } from "../services/ratingPrompt";
import { getPilotState, markEndpointReminderScheduled, PILOT_ENDPOINT_REMINDER_BODY } from "../services/pilotStudy";
import { scheduleReminderAt } from "../services/notifications";
import { getUserState } from "../services/modeEngine";
import { computeAdaptiveMode, getAdaptiveCssClass } from "../services/adaptiveTheme";
import { warmVoskStt } from "../services/voskStt";

// Headless — renders nothing. Owns every app-lifecycle effect that does NOT depend on which nav shell
// (legacy AppShell or the new QuietRoomShell) is mounted, so neither shell has to duplicate or risk
// silently dropping them. Mounted once, above the shell branch, in App.tsx.
//
// Deliberately excludes (kept shell-specific, see App.tsx / QuietRoomShell.tsx): hardware back button
// (its "root" destination differs per shell), notification-tap routing and deep-link routing (both call
// `go()`, whose SET_TAB result only makes visual sense to the shell that reads `state.tab`), and anything
// tied to UI state that stays shell-local (onboarding gate, save-warning banner, wake-word indicator) —
// those remain a deliberate legacy-only concern until the new shell's own onboarding/gates are built.
export default function AppLifecycle() {
  useEffect(() => { void registerNotificationActionTypes(); }, []);

  // request:false — on cold boot only re-arm reminders when permission is ALREADY granted; never fire the
  // system permission dialog unprompted (that's asked for intentionally from onboarding / Settings).
  useEffect(() => { void syncDailyReminders({ request: false }); }, []);
  useEffect(() => { void syncWeeklyDigest({ request: false }); }, []);
  useEffect(() => { void syncWindDownReminder(); }, []);

  useEffect(() => {
    try {
      const meds = loadMedications();
      if (meds.length > 0) void syncMedicationReminders(meds);
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => { void syncInsightNotification(); }, []);

  useEffect(() => {
    recordFirstOpenToday();
    const handleVisibility = () => { if (document.visibilityState === "hidden") recordLastCloseToday(); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", recordLastCloseToday);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); window.removeEventListener("beforeunload", recordLastCloseToday); };
  }, []);

  useEffect(() => { recordAppOpen(); recordPositiveSession(); }, []);

  useEffect(() => {
    const p = getPilotState();
    if (p?.enrolled && !p.endpointReminderScheduled) {
      void scheduleReminderAt(new Date(`${p.endpointDueDay}T10:00:00`), PILOT_ENDPOINT_REMINDER_BODY, "NilaMind", { view: "assessment" })
        .then((r) => { if (r.ok) markEndpointReminderScheduled(); });
    }
  }, []);

  useEffect(() => { void syncEmaCheckins({ request: false }); }, []);

  // Episode-adaptive UI theme (was registered TWICE in AppShell before this extraction — App.tsx:299-312
  // and :397-410, identical bodies, two competing 30s intervals doing the same DOM class toggle. Fixed here
  // by having exactly one registration.)
  useEffect(() => {
    function applyAdaptive() {
      const s = getUserState();
      const m = computeAdaptiveMode(s);
      const c = getAdaptiveCssClass(m);
      const html = document.documentElement;
      html.classList.remove("theme-elevated", "theme-low");
      if (c) html.classList.add(c);
    }
    applyAdaptive();
    document.addEventListener("visibilitychange", applyAdaptive);
    const interval = setInterval(applyAdaptive, 30000);
    return () => { document.removeEventListener("visibilitychange", applyAdaptive); clearInterval(interval); };
  }, []);

  // Warm Vosk STT (was also registered twice — App.tsx:315 and :413 — same fix.)
  useEffect(() => { warmVoskStt(); }, []);

  return null;
}
```

Note: `logMedication` is imported by `AppShell` today but only used inside the notification-tap-routing effect (`actionId === "taken"`), which stays in `AppShell` (it's nav-dependent, calls `go`). Do not move that import — `AppShell` keeps its own `logMedication` import.

- [ ] **Step 3: Modify `src/App.tsx`** — remove the moved effects, the local `activateCrisis`, and their now-unused imports; render `AppLifecycle` and adopt the hook

Remove from `AppShell` (`src/App.tsx`):
- The local `activateCrisis` useCallback (`App.tsx:210-213`) — replaced by `useActivateCrisis()`.
- The 12 effects listed in Step 2 in their entirety: `App.tsx:238` (registerNotificationActionTypes), `:243` (syncDailyReminders), `:246` (syncWeeklyDigest), `:249` (syncWindDownReminder), `:252-257` (medication reminders), `:260` (syncInsightNotification), `:263-269` (wake/bed proxies), `:272` (retention metrics), `:275-281` (pilot study reminder), `:284` (syncEmaCheckins), `:299-312` AND `:397-410` (both adaptive-theme registrations), `:315` AND `:413` (both warmVoskStt calls).
- Now-unused imports: `syncDailyReminders, scheduleReminderAt, syncEmaCheckins, syncWeeklyDigest, syncWindDownReminder, syncMedicationReminders, syncInsightNotification, registerNotificationActionTypes` from `./services/notifications` (keep `suppressNudgesForCrisis` — still used by the hardware-back-independent... actually no longer used directly in AppShell either once `useActivateCrisis` is adopted; remove it from this import too), `recordFirstOpenToday, recordLastCloseToday` from `./services/autoAnchors`, `recordAppOpen` from `./services/retentionMetrics`, `recordPositiveSession` from `./services/ratingPrompt`, `getPilotState, markEndpointReminderScheduled, PILOT_ENDPOINT_REMINDER_BODY` from `./services/pilotStudy`, `getUserState` from `./services/modeEngine`, `computeAdaptiveMode, getAdaptiveCssClass` from `./services/adaptiveTheme`, `warmVoskStt` from `./services/voskStt`. Keep `logMedication, loadMedications` (medication reminders sync moved, but `logMedication` is still used by the notification-tap effect that stays).

Add:
```tsx
import AppLifecycle from "./components/AppLifecycle";
import { useActivateCrisis } from "./hooks/useActivateCrisis";
```

Replace the removed `activateCrisis` declaration with:
```tsx
  const activateCrisis = useActivateCrisis();
```

At the bottom of the file, change the root export to mount `AppLifecycle` once, above the shell:

```tsx
export default function App() {
  return (
    <NavProvider>
      <AppLifecycle />
      <AppShell />
    </NavProvider>
  );
}
```

- [ ] **Step 4: Write `src/components/AppLifecycle.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("../services/notifications", () => ({
  syncDailyReminders: vi.fn(),
  syncWeeklyDigest: vi.fn(),
  syncWindDownReminder: vi.fn(),
  syncMedicationReminders: vi.fn(),
  syncInsightNotification: vi.fn(),
  syncEmaCheckins: vi.fn(),
  registerNotificationActionTypes: vi.fn(),
  scheduleReminderAt: vi.fn().mockResolvedValue({ ok: false }),
  suppressNudgesForCrisis: vi.fn(),
}));
vi.mock("../services/autoAnchors", () => ({ recordFirstOpenToday: vi.fn(), recordLastCloseToday: vi.fn() }));
vi.mock("../services/medicationAdherence", () => ({ loadMedications: vi.fn().mockReturnValue([]), logMedication: vi.fn() }));
vi.mock("../services/retentionMetrics", () => ({ recordAppOpen: vi.fn() }));
vi.mock("../services/ratingPrompt", () => ({ recordPositiveSession: vi.fn() }));
vi.mock("../services/pilotStudy", () => ({ getPilotState: vi.fn().mockReturnValue(null), markEndpointReminderScheduled: vi.fn(), PILOT_ENDPOINT_REMINDER_BODY: "test" }));
vi.mock("../services/modeEngine", () => ({ getUserState: vi.fn().mockReturnValue({}) }));
vi.mock("../services/adaptiveTheme", () => ({ computeAdaptiveMode: vi.fn().mockReturnValue("neutral"), getAdaptiveCssClass: vi.fn().mockReturnValue(null) }));
vi.mock("../services/voskStt", () => ({ warmVoskStt: vi.fn() }));

import AppLifecycle from "./AppLifecycle";
import * as notifications from "../services/notifications";
import * as voskStt from "../services/voskStt";

afterEach(cleanup);

describe("AppLifecycle", () => {
  it("renders nothing", () => {
    const { container } = render(<AppLifecycle />);
    expect(container.innerHTML).toBe("");
  });

  it("fires each sync effect exactly once on mount (regression guard for the duplicate-registration bug)", () => {
    render(<AppLifecycle />);
    expect(notifications.syncDailyReminders).toHaveBeenCalledTimes(1);
    expect(notifications.syncWeeklyDigest).toHaveBeenCalledTimes(1);
    expect(notifications.syncWindDownReminder).toHaveBeenCalledTimes(1);
    expect(notifications.syncInsightNotification).toHaveBeenCalledTimes(1);
    expect(notifications.syncEmaCheckins).toHaveBeenCalledTimes(1);
    expect(notifications.registerNotificationActionTypes).toHaveBeenCalledTimes(1);
    expect(voskStt.warmVoskStt).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Run the new test and the full suite**

Run: `npx vitest run src/components/AppLifecycle.test.tsx`
Expected: 2 tests PASS.

Run: `npx vitest run`
Expected: all existing tests still PASS (no App.tsx behavior change beyond the two bug fixes — confirm no test asserted the duplicate-registration behavior; if one does, it was pinning the bug and should be updated to expect a single call).

- [ ] **Step 6: Typecheck and build**

Run: `npx tsc --noEmit && npx vite build`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/AppLifecycle.tsx src/components/AppLifecycle.test.tsx src/hooks/useActivateCrisis.ts src/App.tsx
git commit -m "refactor(shell): extract AppLifecycle + useActivateCrisis, fix duplicate-effect bug

Adaptive-theme and warmVoskStt were each registered twice in AppShell
(two competing 30s intervals). Extracting the nav-independent lifecycle
effects into a headless AppLifecycle component (mounted once above the
shell branch) fixes this as a side effect and gives the upcoming
QuietRoomShell the same effects for free, without duplicating them."
```

---

### Task 2: Extract `ScreenFallback` and `NavOverlays` (shared sheet/crisis-overlay rendering)

**Files:**
- Create: `src/components/ScreenFallback.tsx`
- Create: `src/components/NavOverlays.tsx`
- Create: `src/components/NavOverlays.test.tsx`
- Modify: `src/App.tsx` (remove the moved JSX/helpers/lazy-imports, render `<NavOverlays/>`)

**Interfaces:**
- Consumes: `useActivateCrisis` (Task 1), `useNav`/`hasOverlay` (`src/services/navStore.tsx`), `AuxView`/`KNOWN_AUX_VIEWS` (`src/services/nav.ts`).
- Produces: `NavOverlays` — `{ groundingExpandIndex: number | undefined; setGroundingExpandIndex: (i: number | undefined) => void; selectedCaregiverContactId: string | undefined; setSelectedCaregiverContactId: (id: string | undefined) => void }`. Renders the crisis overlay (when open) and every sheet-based overlay (grounding, settings, dashboard, medication, caregiver, legal, the generic aux-view sheet, breathing) driven entirely by the shared `useNav()` state — used identically by `AppShell` and the new `QuietRoomShell`.

- [ ] **Step 1: Create `src/components/ScreenFallback.tsx`**

```tsx
import { SkeletonCard, SkeletonList } from "./Skeleton";

// Calm fallback while a lazy screen chunk loads.
export default function ScreenFallback() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonList count={2} />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/NavOverlays.tsx`**

Move verbatim from `src/App.tsx`: the `AUX_LABELS` map (`App.tsx:101-128`), `auxViewLabel` (`:130-132`), `renderAuxView` (`:135-184`), the aux-close-animation-timeout effect (`:219-225`), and the overlay JSX block (`:531-609` — crisis overlay, grounding/settings/dashboard/medication/caregiver/legal sheets, generic aux-view sheet, breathing sheet). Move the lazy imports that only these use: `SettingsScreen, DashboardScreen, MedicationAdherenceScreen, CaregiverShareScreen` (`:20-23`) and `ThoughtRecordScreen, AssessmentScreen, YourDataScreen, NilaMemoryScreen, WindDownScreen, SocialRhythmScreen, DiaryCardScreen, JournalScreen, ReachOutScreen, LearnScreen, ProblemSolvingScreen, ValuesToActionScreen, ExposureHierarchyScreen, RelapsePlanScreen, EpisodeSupportScreen, EmaCheckInScreen, EpisodeMarkerScreen, CaregiverSettingsScreen, BreathingScreen, SoundPlayer, AboutNilaScreen, LegalScreen, InsightsScreen` (`:26-50`), plus the eager `GroundingLibraryScreen` import (`:11`) and `SafetyPlanScreen`, `GuidedProgramsScreen`, `startProtocolChat`, `getSessionChat`/`setSessionChat` (`:80-83`).

```tsx
import { lazy, Suspense, useCallback, useEffect } from "react";
import CrisisOverlay from "./CrisisOverlay";
import GroundingLibraryScreen from "./GroundingLibraryScreen";
import Sheet from "./Sheet";
import ScreenFallback from "./ScreenFallback";
import SafetyPlanScreen from "./SafetyPlanScreen";
import GuidedProgramsScreen from "./GuidedProgramsScreen";
import { startProtocolChat } from "../services/protocolChat";
import { getSessionChat, setSessionChat } from "../services/sessionChat";
import { t } from "../services/i18n";
import { useNav, hasOverlay } from "../services/navStore";
import { type AuxView } from "../services/nav";
import { useActivateCrisis } from "../hooks/useActivateCrisis";

const SettingsScreen = lazy(() => import("./SettingsScreen"));
const DashboardScreen = lazy(() => import("./DashboardScreen"));
const MedicationAdherenceScreen = lazy(() => import("./MedicationAdherenceScreen"));
const CaregiverShareScreen = lazy(() => import("./CaregiverShareScreen"));
const ThoughtRecordScreen = lazy(() => import("./ThoughtRecordScreen"));
const AssessmentScreen = lazy(() => import("./AssessmentScreen"));
const YourDataScreen = lazy(() => import("./YourDataScreen"));
const NilaMemoryScreen = lazy(() => import("./NilaMemoryScreen"));
const WindDownScreen = lazy(() => import("./WindDownScreen"));
const SocialRhythmScreen = lazy(() => import("./SocialRhythmScreen"));
const DiaryCardScreen = lazy(() => import("./DiaryCardScreen"));
const JournalScreen = lazy(() => import("./JournalScreen"));
const ReachOutScreen = lazy(() => import("./ReachOutScreen"));
const LearnScreen = lazy(() => import("./LearnScreen"));
const ProblemSolvingScreen = lazy(() => import("./ProblemSolvingScreen"));
const ValuesToActionScreen = lazy(() => import("./ValuesToActionScreen"));
const ExposureHierarchyScreen = lazy(() => import("./ExposureHierarchyScreen"));
const RelapsePlanScreen = lazy(() => import("./RelapsePlanScreen"));
const EpisodeSupportScreen = lazy(() => import("./EpisodeSupportScreen"));
const EmaCheckInScreen = lazy(() => import("./EmaCheckIn"));
const EpisodeMarkerScreen = lazy(() => import("./EpisodeMarkerScreen"));
const CaregiverSettingsScreen = lazy(() => import("./CaregiverSettingsScreen"));
const BreathingScreen = lazy(() => import("./BreathingScreen"));
const SoundPlayer = lazy(() => import("./SoundPlayer"));
const AboutNilaScreen = lazy(() => import("./AboutNilaScreen"));
const LegalScreen = lazy(() => import("./LegalScreen"));
const InsightsScreen = lazy(() => import("./InsightsScreen"));

const AUX_LABELS: Partial<Record<AuxView, string>> = {
  about_nila: "About Nila",
  insights: "Your patterns",
  thought_record: "Thought record",
  assessment: "Screenings",
  your_data: "Your data",
  nila_memory: "What Nila remembers",
  winddown: "Wind down",
  social_rhythm: "Social rhythm",
  reach_out: "Reach out",
  learn: "Learn",
  problem_solving: "Problem solving",
  values_work: "Values work",
  values_to_action: "Values work",
  exposure: "Exposure hierarchy",
  relapse_plan: "Relapse prevention",
  behaviour: "Phone patterns",
  diary: "Journal",
  dbt_diary_card: "DBT diary card",
  episode: "Episode support",
  ema_checkin: "Quick check‑in",
  episode_marker: "Episode markers",
  caregiver_settings: "Caregiver settings",
  legal: "Legal",
  sounds: "Ambient sounds",
  safety_plan: "My Safety Plan",
  guided_programs: "Guided Programs",
};

function auxViewLabel(view: AuxView): string {
  return AUX_LABELS[view] ?? view;
}

function renderAuxView(view: AuxView, onActivateCrisis: () => void, onClose: () => void, onOpenGrounding: () => void, onOpenView: (target: string) => void, onOpenCaregiverShare?: (contactId: string) => void) {
  switch (view) {
    case "about_nila": return <AboutNilaScreen />;
    case "insights": return <InsightsScreen onClose={onClose} />;
    case "thought_record": return <ThoughtRecordScreen />;
    case "assessment": return <AssessmentScreen onActivateCrisis={onActivateCrisis} />;
    case "your_data": return <YourDataScreen />;
    case "nila_memory": return <NilaMemoryScreen />;
    case "winddown": return <WindDownScreen />;
    case "social_rhythm": return <SocialRhythmScreen />;
    case "reach_out": return <ReachOutScreen />;
    case "learn": return <LearnScreen />;
    case "problem_solving": return <ProblemSolvingScreen />;
    case "values_work":
    case "values_to_action":
      return <ValuesToActionScreen />;
    case "exposure": return <ExposureHierarchyScreen />;
    case "relapse_plan": return <RelapsePlanScreen />;
    case "behaviour": return <DashboardScreen onOpenView={onOpenView} />;
    case "diary": return <JournalScreen />;
    case "dbt_diary_card": return <DiaryCardScreen />;
    case "episode": return <EpisodeSupportScreen onSessionEnded={onClose} onNavigateToGrounding={() => { onClose(); onOpenGrounding(); }} onNavigateToBreathing={() => { onClose(); onOpenGrounding(); }} />;
    case "ema_checkin": return <EmaCheckInScreen onLogged={onClose} onCrisis={() => { onClose(); onActivateCrisis(); }} />;
    case "episode_marker": return <EpisodeMarkerScreen onClose={onClose} />;
    case "caregiver_settings": return <CaregiverSettingsScreen onClose={onClose} onOpenCaregiverShare={onOpenCaregiverShare} />;
    case "sounds": return <SoundPlayer />;
    case "legal": return <LegalScreen />;
    case "safety_plan": return <SafetyPlanScreen />;
    case "guided_programs":
      return (
        <GuidedProgramsScreen
          onStart={(protocolId) => {
            const result = startProtocolChat(protocolId);
            if (result.kind === "started") {
              setSessionChat([...getSessionChat(), { role: "assistant", content: result.prompt }]);
            }
            onClose();
            onOpenView("nila");
          }}
        />
      );
    default: return <div className="p-6 text-slate-400 text-sm text-center">Not available</div>;
  }
}

export interface NavOverlaysProps {
  groundingExpandIndex: number | undefined;
  setGroundingExpandIndex: (i: number | undefined) => void;
  selectedCaregiverContactId: string | undefined;
  setSelectedCaregiverContactId: (id: string | undefined) => void;
}

// Renders every overlay driven by the shared NavProvider state: the crisis takeover, and all sheet-based
// screens (settings, dashboard, medication, caregiver share, legal, grounding, breathing, and the generic
// aux-view sheet that covers the other ~20 screens). Used identically by AppShell (legacy) and
// QuietRoomShell (new) — this is what makes every screen reachable from BOTH shells without duplication.
export default function NavOverlays({ groundingExpandIndex, setGroundingExpandIndex, selectedCaregiverContactId, setSelectedCaregiverContactId }: NavOverlaysProps) {
  const { state, go, closeAuxStart, closeAuxDone, closeTop, openSheet, openAux } = useNav();
  const activateCrisis = useActivateCrisis();

  useEffect(() => {
    const aux = state.overlays.find((o) => o.kind === "aux" && o.closing);
    if (aux) {
      const timer = setTimeout(() => closeAuxDone(), 200);
      return () => clearTimeout(timer);
    }
  }, [state.overlays, closeAuxDone]);

  const onOpenCaregiverShare = useCallback((cid: string) => { setSelectedCaregiverContactId(cid); openSheet("caregiver"); }, [setSelectedCaregiverContactId, openSheet]);

  return (
    <>
      {state.overlays.some((o) => o.kind === "crisis") && (
        <div className="animate-slide-in">
          <CrisisOverlay
            isOpen={true}
            onClose={closeTop}
            onNavigateToGrounding={() => { closeTop(); openSheet("grounding"); }}
            onNavigateToBreathing={() => { closeTop(); openSheet("grounding"); }}
            onBuildPlanLater={() => { closeTop(); openAux("safety_plan"); }}
          />
        </div>
      )}

      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "grounding")} title="Grounding" onClose={() => { closeTop(); setGroundingExpandIndex(undefined); }} id="grounding-sheet">
        <GroundingLibraryScreen autoExpand={groundingExpandIndex} />
      </Sheet>

      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "settings")} title={t("settings")} onClose={closeTop} id="settings-sheet">
        <Suspense fallback={<ScreenFallback />}>
          <SettingsScreen onOpenCaregiver={() => openSheet("caregiver")} onOpenLegal={() => openSheet("legal")} />
        </Suspense>
      </Sheet>

      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "dashboard")} title={t("dashboard")} onClose={closeTop} id="dashboard-sheet">
        <Suspense fallback={<ScreenFallback />}><DashboardScreen onOpenView={(target) => { closeTop(); go(target); }} /></Suspense>
      </Sheet>

      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "medication")} title={t("medications")} onClose={closeTop} id="medication-sheet" bodyClassName="p-4">
        <Suspense fallback={<ScreenFallback />}><MedicationAdherenceScreen /></Suspense>
      </Sheet>

      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "caregiver")} title="Share with a trusted person" onClose={closeTop} id="caregiver-sheet" bodyClassName="p-4">
        <Suspense fallback={<ScreenFallback />}><CaregiverShareScreen selectedContactId={selectedCaregiverContactId} /></Suspense>
      </Sheet>

      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "legal")} title="Legal" onClose={closeTop} id="legal-sheet">
        <Suspense fallback={<ScreenFallback />}><LegalScreen /></Suspense>
      </Sheet>

      {(() => {
        const aux = state.overlays.find((o) => o.kind === "aux");
        if (!aux) return null;
        return (
          <Sheet open title={auxViewLabel(aux.view)} onClose={closeAuxStart} closing={aux.closing} id="aux-view-sheet" faultIsolated>
            <Suspense fallback={<ScreenFallback />}>{renderAuxView(aux.view, activateCrisis, closeAuxStart, () => openSheet("grounding"), go, onOpenCaregiverShare)}</Suspense>
          </Sheet>
        );
      })()}

      {hasOverlay(state, (o) => o.kind === "sheet" && o.id === "breathing") && (
        <Suspense fallback={null}>
          <BreathingScreen onClose={closeTop} />
        </Suspense>
      )}
    </>
  );
}
```

- [ ] **Step 3: Modify `src/App.tsx`**

Remove: the moved imports/lazy-declarations listed above, `AUX_LABELS`/`auxViewLabel`/`renderAuxView`, the local `ScreenFallback` function (replaced by the import), the aux-close-animation-timeout effect (`:219-225`), and the JSX block `:531-609`.

Add:
```tsx
import ScreenFallback from "./components/ScreenFallback";
import NavOverlays from "./components/NavOverlays";
```

In `AppShell`'s render, replace the removed JSX block (where the crisis overlay + sheets used to be, right before the closing `</div>` of the root) with:

```tsx
      <NavOverlays
        groundingExpandIndex={groundingExpandIndex}
        setGroundingExpandIndex={setGroundingExpandIndex}
        selectedCaregiverContactId={selectedCaregiverContactId}
        setSelectedCaregiverContactId={setSelectedCaregiverContactId}
      />
```

`groundingExpandIndex`/`setGroundingExpandIndex` and `selectedCaregiverContactId`/`setSelectedCaregiverContactId` already exist as local state in `AppShell` (`App.tsx:198-199`) — keep them there, just pass them through.

- [ ] **Step 4: Write `src/components/NavOverlays.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NavProvider, useNav } from "../services/navStore";
import NavOverlays from "./NavOverlays";

afterEach(cleanup);

vi.mock("../services/notifications", () => ({ suppressNudgesForCrisis: vi.fn() }));
vi.mock("./CrisisOverlay", () => ({ default: () => <div data-testid="crisis-overlay">Crisis</div> }));

function Harness({ openOnMount }: { openOnMount?: (nav: ReturnType<typeof useNav>) => void }) {
  const nav = useNav();
  if (openOnMount) openOnMount(nav);
  return (
    <NavOverlays
      groundingExpandIndex={undefined}
      setGroundingExpandIndex={() => {}}
      selectedCaregiverContactId={undefined}
      setSelectedCaregiverContactId={() => {}}
    />
  );
}

describe("NavOverlays", () => {
  it("renders no overlay when nav state is empty", () => {
    render(<NavProvider><Harness /></NavProvider>);
    expect(screen.queryByTestId("crisis-overlay")).toBeNull();
  });

  it("renders the crisis overlay when nav state has a crisis overlay open", () => {
    render(<NavProvider><Harness openOnMount={(nav) => { if (nav.state.overlays.length === 0) nav.openCrisis(); }} /></NavProvider>);
    expect(screen.getByTestId("crisis-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests, typecheck, build**

Run: `npx vitest run src/components/NavOverlays.test.tsx`
Expected: 2 tests PASS.

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: all PASS, no errors. This is the highest-risk mechanical step in the plan (largest single move) — if any existing test fails, diff its failure against `git stash` to confirm it's a real regression from this move, not a pre-existing flake, before proceeding.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScreenFallback.tsx src/components/NavOverlays.tsx src/components/NavOverlays.test.tsx src/App.tsx
git commit -m "refactor(shell): extract NavOverlays (crisis + sheet rendering) from AppShell

Shared by AppShell today and QuietRoomShell next — moving this out now
means the new shell gets every existing screen (all sheets + the
generic aux-view route covering ~20 screens) for free instead of
duplicating ~150 lines of overlay JSX."
```

---

### Task 3: Feature flag + `QuietRoomShell` stub wired into `App.tsx`

**Files:**
- Create: `src/shell/QuietRoomShell.tsx` (stub — full version built in Task 12)
- Create: `src/App.flag.test.tsx`
- Modify: `src/App.tsx` (add the flag branch)

**Interfaces:**
- Produces: `QuietRoomShell` — no props (reads nav via `useNav()` internally). Stub renders a placeholder; Task 12 replaces the body without changing this export shape.

- [ ] **Step 1: Create `src/services/featureFlags.ts`**

`import.meta.env`-based flags are notoriously fragile to mock in Vitest across versions (the value is often read at module-eval time, before a test's `vi.stubEnv` + `vi.resetModules()` takes effect). Route the read through one small, directly-mockable function from the start rather than reading `import.meta.env` inline in `App.tsx` — avoids that whole class of test flakiness:

```ts
// One indirection point for build-time feature flags, so tests can mock the flag directly instead of
// fighting import.meta.env's module-eval-time semantics.
export function isQuietRoomShellEnabled(): boolean {
  return import.meta.env.VITE_QUIET_ROOM_SHELL === "true";
}
```

- [ ] **Step 2: Create the `QuietRoomShell` stub**

```tsx
import NavOverlays from "../components/NavOverlays";
import { useState } from "react";

// Stub — replaced with the real 5-scene ring in a later task. Exists now so the flag branch in App.tsx
// has something real to render and can be tested end-to-end from the start.
export default function QuietRoomShell() {
  const [groundingExpandIndex, setGroundingExpandIndex] = useState<number | undefined>();
  const [selectedCaregiverContactId, setSelectedCaregiverContactId] = useState<string | undefined>();
  return (
    <div className="relative isolate h-dvh bg-page text-ink flex items-center justify-center" data-testid="quiet-room-shell-stub">
      <p className="text-ink-muted text-sm">Quiet Room shell — under construction</p>
      <NavOverlays
        groundingExpandIndex={groundingExpandIndex}
        setGroundingExpandIndex={setGroundingExpandIndex}
        selectedCaregiverContactId={selectedCaregiverContactId}
        setSelectedCaregiverContactId={setSelectedCaregiverContactId}
      />
    </div>
  );
}
```

- [ ] **Step 3: Modify `src/App.tsx`** — add the flag branch

Add near the top of the file:
```tsx
import QuietRoomShell from "./shell/QuietRoomShell";
import { isQuietRoomShellEnabled } from "./services/featureFlags";
```

Change the root export:
```tsx
export default function App() {
  return (
    <NavProvider>
      <AppLifecycle />
      {isQuietRoomShellEnabled() ? <QuietRoomShell /> : <AppShell />}
    </NavProvider>
  );
}
```

- [ ] **Step 4: Write `src/App.flag.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
vi.mock("./services/theme", () => ({ initTheme: vi.fn() }));

describe("App flag branch", () => {
  it("renders the legacy AppShell tab bar when the flag is off (default)", async () => {
    vi.doMock("./services/featureFlags", () => ({ isQuietRoomShellEnabled: () => false }));
    const { default: App } = await import("./App");
    render(<App />);
    expect(screen.getByRole("tablist", { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.queryByTestId("quiet-room-shell-stub")).toBeNull();
    vi.doUnmock("./services/featureFlags");
    vi.resetModules();
  });

  it("renders QuietRoomShell when the flag is on", async () => {
    vi.doMock("./services/featureFlags", () => ({ isQuietRoomShellEnabled: () => true }));
    const { default: App } = await import("./App");
    render(<App />);
    expect(screen.getByTestId("quiet-room-shell-stub")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: /main navigation/i })).toBeNull();
    vi.doUnmock("./services/featureFlags");
    vi.resetModules();
  });
});
```

`vi.doMock` + dynamic `import()` (rather than `vi.stubEnv`/`import.meta.env`) is what makes this reliable: it mocks the flag function directly, sidestepping any Vite/Vitest version differences in when `import.meta.env` is evaluated relative to a stub.

- [ ] **Step 5: Run the test, full suite, typecheck, build**

Run: `npx vitest run src/App.flag.test.tsx`
Expected: 2 tests PASS.

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: all PASS (default build has the flag unset, so this also proves the legacy path is unaffected by default).

Run: `VITE_QUIET_ROOM_SHELL=true npx vite build`
Expected: builds cleanly with the flag on.

- [ ] **Step 6: Commit**

```bash
git add src/shell/QuietRoomShell.tsx src/App.flag.test.tsx src/App.tsx src/services/featureFlags.ts
git commit -m "feat(shell): wire VITE_QUIET_ROOM_SHELL flag with a QuietRoomShell stub

Dev-only, off by default. Proves the flag branch and NavOverlays reuse
work end-to-end before building out the real scene ring."
```

---

### Task 4: `HelpPill` — the pinned crisis-access affordance

**Files:**
- Create: `src/shell/components/HelpPill.tsx`
- Create: `src/shell/components/HelpPill.test.tsx`

**Interfaces:**
- Consumes: `CrisisHeaderButton` (`src/components/CrisisHeaderButton.tsx`, unmodified).
- Produces: `HelpPill({ onPress: () => void })` — fixed-position wrapper, always visible regardless of scroll, safe-area aware.

- [ ] **Step 1: Write the test first**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import HelpPill from "./HelpPill";

afterEach(cleanup);

describe("HelpPill", () => {
  it("renders an accessible 'Get help now' button", () => {
    render(<HelpPill onPress={vi.fn()} />);
    expect(screen.getByRole("button", { name: /get help now/i })).toBeInTheDocument();
  });

  it("calls onPress when tapped", () => {
    const onPress = vi.fn();
    render(<HelpPill onPress={onPress} />);
    fireEvent.click(screen.getByRole("button", { name: /get help now/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/components/HelpPill.test.tsx`
Expected: FAIL — `Cannot find module './HelpPill'`.

- [ ] **Step 3: Implement `HelpPill`**

```tsx
import CrisisHeaderButton from "../../components/CrisisHeaderButton";

export interface HelpPillProps {
  onPress: () => void;
}

// The one crisis-access affordance for the entire Quiet Room shell — rendered ONCE, at the SceneRing
// level (see SceneRing.tsx), never per-scene. That is a deliberate structural choice: there is nothing
// for a future scene to forget, unlike a "each scene must remember to render this" convention.
// Fixed-position, safe-area aware, never scrolls with scene content. Wraps the app's existing
// CrisisHeaderButton rather than inventing new crisis UI.
export default function HelpPill({ onPress }: HelpPillProps) {
  return (
    <div
      className="fixed right-3 z-50"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <CrisisHeaderButton onClick={onPress} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test again**

Run: `npx vitest run src/shell/components/HelpPill.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/components/HelpPill.tsx src/shell/components/HelpPill.test.tsx
git commit -m "feat(shell): add HelpPill, a pinned wrapper around the existing CrisisHeaderButton"
```

---

### Task 5: `Orb` — presentational breathing/tappable orb

**Files:**
- Create: `src/shell/components/Orb.tsx`
- Create: `src/shell/components/Orb.test.tsx`

**Interfaces:**
- Produces: `Orb({ onPress?: () => void; size?: number })` — a themeable circular element using existing semantic tokens (`--color-accent`, `--color-hero`), with a slow breathing-scale animation disabled when the user prefers reduced motion.

- [ ] **Step 1: Write the test first**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Orb from "./Orb";

afterEach(cleanup);

describe("Orb", () => {
  it("renders a tappable element with an accessible label", () => {
    render(<Orb onPress={vi.fn()} />);
    expect(screen.getByRole("button", { name: /nila/i })).toBeInTheDocument();
  });

  it("calls onPress when tapped", () => {
    const onPress = vi.fn();
    render(<Orb onPress={onPress} />);
    fireEvent.click(screen.getByRole("button", { name: /nila/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders without a button role when onPress is omitted (Presence scene, ambient-only)", () => {
    render(<Orb />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/components/Orb.test.tsx`
Expected: FAIL — `Cannot find module './Orb'`.

- [ ] **Step 3: Implement `Orb`**

```tsx
import { useReducedMotion } from "../../hooks/useReducedMotion";

export interface OrbProps {
  onPress?: () => void;
  size?: number;
}

// Presentational only — no chat/crisis logic here. Uses the existing semantic token layer (accent/hero)
// so it themes correctly across dark/light without any new tokens (see Global Constraints).
export default function Orb({ onPress, size = 96 }: OrbProps) {
  const prefersReduced = useReducedMotion();
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: "radial-gradient(circle at 35% 30%, var(--color-accent-hi), var(--color-accent) 55%, var(--color-hero) 100%)",
    boxShadow: "0 0 40px 10px color-mix(in srgb, var(--color-accent) 35%, transparent)",
    animation: prefersReduced ? "none" : "orb-breathe 6s ease-in-out infinite",
  };

  if (!onPress) {
    return <div style={style} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label="Talk to Nila"
      style={{ ...style, cursor: "pointer", border: "none", padding: 0 }}
    >
      <span className="sr-only">Talk to Nila</span>
    </button>
  );
}
```

Add the `orb-breathe` keyframe to `src/index.css` (near the other animation keyframes — search the file for an existing `@keyframes` block to place it alongside):

```css
@keyframes orb-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

- [ ] **Step 4: Run the test again**

Run: `npx vitest run src/shell/components/Orb.test.tsx`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/components/Orb.tsx src/shell/components/Orb.test.tsx src/index.css
git commit -m "feat(shell): add the presentational Orb component"
```

---

### Task 6: `SceneRing` — swipeable container, dot nav, and the structural HelpPill guarantee

**Files:**
- Create: `src/shell/components/SceneRing.tsx`
- Create: `src/shell/components/SceneRing.test.tsx`
- Create: `src/shell/shell.boundary.test.ts`

**Interfaces:**
- Consumes: `HelpPill` (Task 4).
- Produces: `SceneRing({ scenes: { id: string; label: string; content: React.ReactNode }[]; activeIndex: number; onActiveIndexChange: (i: number) => void; onHelpPress: () => void; swipeLocked: boolean })`. All `scenes` stay mounted simultaneously (translated, never conditionally rendered) — this is what QuietRoomShell (Task 12) will render its 5 real scenes through.

- [ ] **Step 1: Write `SceneRing.test.tsx` first**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import SceneRing from "./SceneRing";

afterEach(cleanup);

function scenes() {
  return [0, 1, 2, 3, 4].map((i) => ({ id: `scene-${i}`, label: `Scene ${i}`, content: <div data-testid={`content-${i}`}>Content {i}</div> }));
}

describe("SceneRing", () => {
  it("renders all 5 scenes mounted at once, regardless of activeIndex", () => {
    render(<SceneRing scenes={scenes()} activeIndex={2} onActiveIndexChange={vi.fn()} onHelpPress={vi.fn()} swipeLocked={false} />);
    for (let i = 0; i < 5; i++) expect(screen.getByTestId(`content-${i}`)).toBeInTheDocument();
  });

  it("renders exactly one HelpPill regardless of which scene is active", () => {
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(<SceneRing scenes={scenes()} activeIndex={i} onActiveIndexChange={vi.fn()} onHelpPress={vi.fn()} swipeLocked={false} />);
      expect(screen.getAllByRole("button", { name: /get help now/i })).toHaveLength(1);
      unmount();
    }
  });

  it("renders one dot per scene, marking the active one", () => {
    render(<SceneRing scenes={scenes()} activeIndex={1} onActiveIndexChange={vi.fn()} onHelpPress={vi.fn()} swipeLocked={false} />);
    const dots = screen.getAllByRole("button", { name: /^go to / });
    expect(dots).toHaveLength(5);
    expect(dots[1]).toHaveAttribute("aria-current", "true");
  });

  it("tapping a dot calls onActiveIndexChange with that scene's index", () => {
    const onActiveIndexChange = vi.fn();
    render(<SceneRing scenes={scenes()} activeIndex={0} onActiveIndexChange={onActiveIndexChange} onHelpPress={vi.fn()} swipeLocked={false} />);
    screen.getByRole("button", { name: /go to scene 3/i }).click();
    expect(onActiveIndexChange).toHaveBeenCalledWith(3);
  });

  it("clamps: tapping the dot for the already-active scene is a no-op", () => {
    const onActiveIndexChange = vi.fn();
    render(<SceneRing scenes={scenes()} activeIndex={2} onActiveIndexChange={onActiveIndexChange} onHelpPress={vi.fn()} swipeLocked={false} />);
    screen.getByRole("button", { name: /go to scene 2/i }).click();
    expect(onActiveIndexChange).not.toHaveBeenCalled();
  });

  it("a leftward swipe past the threshold advances to the next scene", () => {
    const onActiveIndexChange = vi.fn();
    const { container } = render(<SceneRing scenes={scenes()} activeIndex={1} onActiveIndexChange={onActiveIndexChange} onHelpPress={vi.fn()} swipeLocked={false} />);
    const track = container.querySelector(".flex.h-full.w-full") as HTMLElement;
    fireEvent.touchStart(track, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 200 }] });
    expect(onActiveIndexChange).toHaveBeenCalledWith(2);
  });

  it("a rightward swipe past the threshold retreats to the previous scene", () => {
    const onActiveIndexChange = vi.fn();
    const { container } = render(<SceneRing scenes={scenes()} activeIndex={1} onActiveIndexChange={onActiveIndexChange} onHelpPress={vi.fn()} swipeLocked={false} />);
    const track = container.querySelector(".flex.h-full.w-full") as HTMLElement;
    fireEvent.touchStart(track, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 300 }] });
    expect(onActiveIndexChange).toHaveBeenCalledWith(0);
  });

  it("a swipe below the threshold is a no-op", () => {
    const onActiveIndexChange = vi.fn();
    const { container } = render(<SceneRing scenes={scenes()} activeIndex={1} onActiveIndexChange={onActiveIndexChange} onHelpPress={vi.fn()} swipeLocked={false} />);
    const track = container.querySelector(".flex.h-full.w-full") as HTMLElement;
    fireEvent.touchStart(track, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 290 }] });
    expect(onActiveIndexChange).not.toHaveBeenCalled();
  });

  it("swiping is a no-op while swipeLocked (crisis overlay open)", () => {
    const onActiveIndexChange = vi.fn();
    const { container } = render(<SceneRing scenes={scenes()} activeIndex={1} onActiveIndexChange={onActiveIndexChange} onHelpPress={vi.fn()} swipeLocked={true} />);
    const track = container.querySelector(".flex.h-full.w-full") as HTMLElement;
    fireEvent.touchStart(track, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 100 }] });
    expect(onActiveIndexChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/components/SceneRing.test.tsx`
Expected: FAIL — `Cannot find module './SceneRing'`.

- [ ] **Step 3: Implement `SceneRing`**

```tsx
import { useRef } from "react";
import HelpPill from "./HelpPill";

export interface Scene {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface SceneRingProps {
  scenes: Scene[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onHelpPress: () => void;
  swipeLocked: boolean;
}

const SWIPE_THRESHOLD_PX = 50;

// The only place that knows about swiping, dots, and crisis-affordance placement. All scenes stay mounted
// (translated via a flex track, never conditionally rendered) so switching scenes can never unmount an
// in-progress conversation mid-stream — see the mount policy in the shell design spec. Swiping is
// disabled (swipeLocked) while a crisis overlay is open.
export default function SceneRing({ scenes, activeIndex, onActiveIndexChange, onHelpPress, swipeLocked }: SceneRingProps) {
  // A ref, not a plain local variable: a local `let` is re-created every render, so it would only survive
  // between touchstart and touchend if no re-render happened in between — true today, but a ref is the
  // correct, render-count-independent way to hold this and costs nothing.
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (swipeLocked) return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeLocked || touchStartX.current === null) return;
    const startX = touchStartX.current;
    const endX = e.changedTouches[0]?.clientX ?? startX;
    touchStartX.current = null;
    const delta = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    const next = delta < 0 ? activeIndex + 1 : activeIndex - 1;
    if (next >= 0 && next < scenes.length) onActiveIndexChange(next);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-page">
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {scenes.map((scene) => (
          <div key={scene.id} className="h-full w-full shrink-0 overflow-hidden">
            {scene.content}
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2" role="tablist" aria-label="Scenes">
        {scenes.map((scene, i) => (
          <button
            key={scene.id}
            type="button"
            role="button"
            aria-label={`Go to ${scene.label}`}
            aria-current={i === activeIndex}
            onClick={() => { if (i !== activeIndex) onActiveIndexChange(i); }}
            className={`h-2 w-2 rounded-full transition-colors ${i === activeIndex ? "bg-accent" : "bg-line-strong"}`}
          />
        ))}
      </div>

      <HelpPill onPress={onHelpPress} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test again**

Run: `npx vitest run src/shell/components/SceneRing.test.tsx`
Expected: 10 tests PASS.

- [ ] **Step 5: Write `src/shell/shell.boundary.test.ts` (static structure check, complements the runtime check above)**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Static companion to SceneRing.test.tsx's runtime DOM check. Two invariants:
//  1. SceneRing.tsx is the ONE file that imports HelpPill — if a scene file starts importing it too, that's
//     a sign someone is trying to render a second, competing Help affordance instead of relying on the
//     ring-level one, which would defeat the "nothing to forget" structural guarantee.
//  2. Scene files never import CrisisOverlay directly — crisis takeover rendering belongs to NavOverlays
//     only; a scene importing it directly would be a second, unsynchronized crisis surface.
const SCENES_DIR = join(__dirname, "scenes");
const COMPONENTS_DIR = join(__dirname, "components");

function sceneFiles(): string[] {
  // Written in this task, before any scene file exists yet (Tasks 7-11 add them) — treat a missing
  // directory as zero scene files rather than throwing, so this test is meaningful (vacuously passing)
  // from the moment it's written, and becomes a real check as each scene file lands.
  try {
    return readdirSync(SCENES_DIR).filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"));
  } catch {
    return [];
  }
}

describe("shell boundary — HelpPill and crisis-overlay ownership", () => {
  it("no scene file imports HelpPill directly", () => {
    for (const file of sceneFiles()) {
      const src = readFileSync(join(SCENES_DIR, file), "utf-8");
      expect(src, `${file} should not import HelpPill — SceneRing renders it once for all scenes`).not.toMatch(/HelpPill/);
    }
  });

  it("no scene file imports CrisisOverlay directly", () => {
    for (const file of sceneFiles()) {
      const src = readFileSync(join(SCENES_DIR, file), "utf-8");
      expect(src, `${file} should not import CrisisOverlay — NavOverlays owns crisis-takeover rendering`).not.toMatch(/CrisisOverlay/);
    }
  });

  it("SceneRing.tsx imports and unconditionally renders HelpPill", () => {
    const src = readFileSync(join(COMPONENTS_DIR, "SceneRing.tsx"), "utf-8");
    expect(src).toMatch(/import HelpPill from ["']\.\/HelpPill["']/);
    // Not inside the scenes.map(...) callback — i.e. it appears after that block closes, as a sibling.
    const mapEnd = src.lastIndexOf("scenes.map(");
    const helpPillUsage = src.indexOf("<HelpPill", mapEnd);
    expect(helpPillUsage).toBeGreaterThan(-1);
  });
});
```

- [ ] **Step 6: Run it, typecheck**

Run: `npx vitest run src/shell/shell.boundary.test.ts`
Expected: 3 tests PASS — the two "no scene file imports X" checks pass vacuously (no scene files exist yet), the `SceneRing` check passes for real. Re-run after Task 11 (Step 6 there) once real scene files exist, so the vacuous checks become meaningful.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/shell/components/SceneRing.tsx src/shell/components/SceneRing.test.tsx src/shell/shell.boundary.test.ts
git commit -m "feat(shell): add SceneRing — swipeable, always-mounted, single structural HelpPill"
```

---

### Task 7: `PresenceScene`

**Files:**
- Create: `src/shell/scenes/PresenceScene.tsx`
- Create: `src/shell/scenes/PresenceScene.test.tsx`

**Interfaces:**
- Consumes: `Orb` (Task 5).
- Produces: `PresenceScene({ onOpenTalk: () => void })`.

- [ ] **Step 1: Write the test first**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import PresenceScene from "./PresenceScene";

afterEach(cleanup);

describe("PresenceScene", () => {
  it("renders the orb and a caption inviting the user to talk", () => {
    render(<PresenceScene onOpenTalk={vi.fn()} />);
    expect(screen.getByRole("button", { name: /talk to nila/i })).toBeInTheDocument();
    expect(screen.getByText(/nila is here/i)).toBeInTheDocument();
  });

  it("tapping the orb calls onOpenTalk", () => {
    const onOpenTalk = vi.fn();
    render(<PresenceScene onOpenTalk={onOpenTalk} />);
    screen.getByRole("button", { name: /talk to nila/i }).click();
    expect(onOpenTalk).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/scenes/PresenceScene.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import Orb from "../components/Orb";

export interface PresenceSceneProps {
  onOpenTalk: () => void;
}

export default function PresenceScene({ onOpenTalk }: PresenceSceneProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-6 px-8 text-center">
      <Orb onPress={onOpenTalk} size={112} />
      <p className="text-ink-2 text-sm max-w-[220px]">Nila is here. Tap to talk, or just sit with her.</p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test again**

Run: `npx vitest run src/shell/scenes/PresenceScene.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/scenes/PresenceScene.tsx src/shell/scenes/PresenceScene.test.tsx
git commit -m "feat(shell): add PresenceScene"
```

---

### Task 8: `TalkScene` — thin host for `<ModeScreen>`

**Files:**
- Create: `src/shell/scenes/TalkScene.tsx`
- Create: `src/shell/scenes/TalkScene.test.tsx`

**Interfaces:**
- Consumes: `ModeScreen` (`src/components/ModeScreen.tsx`, unmodified — its `ModeScreenProps` from `App.tsx:62-77`).
- Produces: `TalkScene` — identical prop shape to `ModeScreenProps`, pure passthrough.

- [ ] **Step 1: Write the test first**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TalkScene from "./TalkScene";

afterEach(cleanup);
vi.mock("../../components/ModeScreen", () => ({ default: (props: any) => <div data-testid="mode-screen-host">{JSON.stringify(Object.keys(props))}</div> }));

describe("TalkScene", () => {
  it("hosts ModeScreen and forwards all its props verbatim", () => {
    const props = {
      onOpenSettings: vi.fn(), onOpenCrisis: vi.fn(), onOpenDashboard: vi.fn(), onOpenMedication: vi.fn(),
      onOpenGrounding: vi.fn(), onOpenDiary: vi.fn(), onOpenReachOut: vi.fn(), onOpenWindDown: vi.fn(),
      activeCapture: null, onOpenCapture: vi.fn(), onCloseCapture: vi.fn(),
    };
    render(<TalkScene {...props} />);
    const rendered = JSON.parse(screen.getByTestId("mode-screen-host").textContent ?? "[]");
    for (const key of Object.keys(props)) expect(rendered).toContain(key);
  });
});
```

This test intentionally documents that `TalkScene` is a passthrough, not a reimplementation — per the design review finding that `ModeScreen`'s `messages` state cannot be safely decomposed further (see `useCrisisGate.ts`'s ownership comment).

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/scenes/TalkScene.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import ModeScreen from "../../components/ModeScreen";
import type { CaptureSheetId } from "../../services/navStore";

export interface TalkSceneProps {
  onOpenSettings?: () => void;
  onOpenCrisis?: () => void;
  onOpenDashboard?: () => void;
  onOpenMedication?: () => void;
  onOpenGrounding?: (expandIndex?: number) => void;
  onOpenDiary?: () => void;
  onOpenReachOut?: () => void;
  onOpenWindDown?: () => void;
  activeCapture?: CaptureSheetId | null;
  onOpenCapture?: (id: CaptureSheetId) => void;
  onCloseCapture?: () => void;
}

// A thin frame, not a reimplementation. ModeScreen's `messages` state is documented (useCrisisGate.ts) as
// un-liftable — it's read by useNudges, the render, and the protocol handlers in a cycle. TalkScene hosts
// the real ModeScreen wholesale, wired through the exact same props AppShell already passes it.
export default function TalkScene(props: TalkSceneProps) {
  return (
    <div className="h-full w-full min-h-0 flex flex-col">
      <ModeScreen {...props} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test again**

Run: `npx vitest run src/shell/scenes/TalkScene.test.tsx`
Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/scenes/TalkScene.tsx src/shell/scenes/TalkScene.test.tsx
git commit -m "feat(shell): add TalkScene — thin host for the real ModeScreen"
```

---

### Task 9: `CheckInScene` — deliberate placeholder

**Files:**
- Create: `src/shell/scenes/CheckInScene.tsx`
- Create: `src/shell/scenes/CheckInScene.test.tsx`

**Interfaces:**
- Produces: `CheckInScene()` — no props, static content.

- [ ] **Step 1: Write the test first**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CheckInScene from "./CheckInScene";

afterEach(cleanup);

describe("CheckInScene", () => {
  it("renders a deliberate placeholder pointing to Talk for now", () => {
    render(<CheckInScene />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/check in from the talk scene/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/scenes/CheckInScene.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// Deliberate placeholder, not a stub-to-forget. Per the design spec (2026-07-19-quiet-room-shell-design.md,
// "Design review" section): NilaCheckIn's handlers write directly into ModeScreen's message state, and
// NilaCheckIn is currently only ever rendered from inside ModeScreen — the same chat-state entanglement
// TalkScene had before the design review corrected it. Whether Check-in ends up hosting ModeScreen
// wholesale (like Talk) or gets a genuine extraction is a sub-project-2 decision, not made here.
export default function CheckInScene() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-ink-muted text-sm">Check-in is coming to this space soon.</p>
      <p className="text-ink-faint text-xs">For now, check in from the Talk scene.</p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test again**

Run: `npx vitest run src/shell/scenes/CheckInScene.test.tsx`
Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/scenes/CheckInScene.tsx src/shell/scenes/CheckInScene.test.tsx
git commit -m "feat(shell): add CheckInScene placeholder (real content deferred to sub-project 2)"
```

---

### Task 10: `BreatheScene` — thin host for `<BreathingScreen>`

**Files:**
- Create: `src/shell/scenes/BreatheScene.tsx`
- Create: `src/shell/scenes/BreatheScene.test.tsx`

**Interfaces:**
- Consumes: `BreathingScreen` (`src/components/BreathingScreen.tsx`, unmodified — props `{ onClose: () => void; defaultPattern?: BreathPattern }`).
- Produces: `BreatheScene({ onClose: () => void })`.

- [ ] **Step 1: Write the test first**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Suspense } from "react";
import BreatheScene from "./BreatheScene";

afterEach(cleanup);
vi.mock("../../components/BreathingScreen", () => ({ default: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>close-breathing</button> }));

describe("BreatheScene", () => {
  it("hosts BreathingScreen and forwards onClose", async () => {
    const onClose = vi.fn();
    render(<Suspense fallback={null}><BreatheScene onClose={onClose} /></Suspense>);
    const btn = await screen.findByText("close-breathing");
    btn.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/scenes/BreatheScene.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import { lazy, Suspense } from "react";
import ScreenFallback from "../../components/ScreenFallback";

// Separate lazy() registration from NavOverlays.tsx's — same underlying chunk, cached by Vite; not worth
// a shared-module indirection for one overlapping component (see plan Global Constraints).
const BreathingScreen = lazy(() => import("../../components/BreathingScreen"));

export interface BreatheSceneProps {
  onClose: () => void;
}

export default function BreatheScene({ onClose }: BreatheSceneProps) {
  return (
    <div className="h-full w-full min-h-0">
      <Suspense fallback={<ScreenFallback />}>
        <BreathingScreen onClose={onClose} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 4: Run the test again**

Run: `npx vitest run src/shell/scenes/BreatheScene.test.tsx`
Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/scenes/BreatheScene.tsx src/shell/scenes/BreatheScene.test.tsx
git commit -m "feat(shell): add BreatheScene — thin host for the real BreathingScreen"
```

---

### Task 11: `ToolkitScene` — hosts `<ToolsScreen>` + `<YouScreen>` wholesale

**Files:**
- Create: `src/shell/scenes/ToolkitScene.tsx`
- Create: `src/shell/scenes/ToolkitScene.test.tsx`
- Create: `src/shell/scenes/ToolkitScene.reachability.test.ts`

**Interfaces:**
- Consumes: `ToolsScreen` (`src/components/ToolsScreen.tsx`, props `{ go, onEpisode, phoneEnabled, onOpenCrisis }`), `YouScreen` (`src/components/YouScreen.tsx`, props include `go`, `onOpenCrisis`), `buildToolGroups` (`src/components/toolsRows.ts`), `buildYouGroups` (`src/components/youRows.ts`), `KNOWN_AUX_VIEWS` (`src/services/nav.ts`).
- Produces: `ToolkitScene({ go: (target: string) => void; onEpisode: () => void; phoneEnabled: boolean; onOpenCrisis: () => void })`.

- [ ] **Step 1: Write the test first**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ToolkitScene from "./ToolkitScene";

afterEach(cleanup);
vi.mock("../../components/ToolsScreen", () => ({ default: () => <div data-testid="tools-screen">Tools content</div> }));
vi.mock("../../components/YouScreen", () => ({ default: () => <div data-testid="you-screen">You content</div> }));

describe("ToolkitScene", () => {
  it("defaults to showing the Tools section", () => {
    render(<ToolkitScene go={vi.fn()} onEpisode={vi.fn()} phoneEnabled onOpenCrisis={vi.fn()} />);
    expect(screen.getByTestId("tools-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("you-screen")).toBeNull();
  });

  it("switches to the You section on tap and back", () => {
    render(<ToolkitScene go={vi.fn()} onEpisode={vi.fn()} phoneEnabled onOpenCrisis={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^you$/i }));
    expect(screen.getByTestId("you-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("tools-screen")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^tools$/i }));
    expect(screen.getByTestId("tools-screen")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/scenes/ToolkitScene.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import { useState } from "react";
import ToolsScreen from "../../components/ToolsScreen";
import YouScreen from "../../components/YouScreen";

export interface ToolkitSceneProps {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
  onOpenCrisis: () => void;
}

// Hosts the existing ToolsScreen and YouScreen wholesale — same "don't recompose, reuse" pattern as
// TalkScene/BreatheScene. Both already call `go(target)` against the shared nav state, so every one of
// the ~21 screens they reach is reachable here too, with zero new routing/grouping logic. The unified
// searchable-list redesign (this scene's own IA, not "Tools + You stapled together") is sub-project 3's
// job, per the shell design spec's explicit deferral.
export default function ToolkitScene({ go, onEpisode, phoneEnabled, onOpenCrisis }: ToolkitSceneProps) {
  const [section, setSection] = useState<"tools" | "you">("tools");

  return (
    <div className="h-full w-full min-h-0 flex flex-col">
      <div className="shrink-0 flex gap-2 px-4 pt-3" role="tablist" aria-label="Toolkit section">
        <button
          type="button"
          role="tab"
          aria-selected={section === "tools"}
          onClick={() => setSection("tools")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${section === "tools" ? "bg-accent text-white" : "bg-fill text-ink-muted"}`}
        >
          Tools
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === "you"}
          onClick={() => setSection("you")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${section === "you" ? "bg-accent text-white" : "bg-fill text-ink-muted"}`}
        >
          You
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-12">
        {section === "tools" ? (
          <ToolsScreen go={go} onEpisode={onEpisode} phoneEnabled={phoneEnabled} onOpenCrisis={onOpenCrisis} />
        ) : (
          <YouScreen go={go} onOpenCrisis={onOpenCrisis} />
        )}
      </div>
    </div>
  );
}
```

`YouScreen`'s prop interface is confirmed inline at `src/components/YouScreen.tsx:95` as exactly `{ go: (target: string) => void; onOpenCrisis: () => void }` — matches the call above with no extra props needed.

- [ ] **Step 4: Run the test again**

Run: `npx vitest run src/shell/scenes/ToolkitScene.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 5: Write the real `KNOWN_AUX_VIEWS` reachability test**

Hosting `ToolsScreen`+`YouScreen` wholesale does **not** trivially cover all 30 `KNOWN_AUX_VIEWS` — checking their row ids (`buildToolGroups`/`buildYouGroups`, both pure functions, importable directly) against `KNOWN_AUX_VIEWS` shows 4 real gaps that are drill-down-reachable in the legacy app today, not top-level rows: `caregiver` (via the `caregiver_settings` row's own screen), `legal` (via Settings' `onOpenLegal` callback), `safety_plan` (via `CrisisOverlay`'s `onBuildPlanLater`), `guided_programs` (surfaced from within a Nila conversation). Plus two that are expected to have no route at all: `values_work` (retired alias — `toolsRows.ts`'s own comment says `values_to_action` replaced it) and `episode` (a Nila mode reached via the `onEpisode` callback, not a `go("episode")` route). Asserting "every view is a direct row" would be a false claim about the legacy app itself — write the honest version instead:

```ts
import { describe, it, expect } from "vitest";
import { buildToolGroups } from "../../components/toolsRows";
import { buildYouGroups } from "../../components/youRows";
import { KNOWN_AUX_VIEWS } from "../../services/nav";

// Real reachability check, not a wishful one: ToolkitScene hosts ToolsScreen + YouScreen wholesale, so it
// gets exactly the same reachability those two screens already provide in the legacy app — no more, no
// less. Some KNOWN_AUX_VIEWS are drill-down-only even today (documented below), not top-level rows.
// Documenting the split (rather than asserting "every view is a row") is what makes this a real regression
// guard: a FUTURE aux view added to KNOWN_AUX_VIEWS with neither a row nor a documented drill-down path
// fails this test, forcing a deliberate decision — same philosophy as nav.contract.test.ts's golden set.
const DRILL_DOWN_ONLY: Record<string, string> = {
  legal: "Settings screen's own onOpenLegal callback (opens the Legal sheet)",
  caregiver: "the caregiver_settings row's own screen, which opens the caregiver share sheet",
  safety_plan: "CrisisOverlay's onBuildPlanLater button (rendered by the shared NavOverlays)",
  guided_programs: "surfaced from within a Nila chat conversation, not a Tools/You row",
};
const NOT_APPLICABLE = new Set(["values_work", "episode"]);

describe("ToolkitScene — KNOWN_AUX_VIEWS reachability", () => {
  it("every KNOWN_AUX_VIEWS entry is either a Tools/You row or a documented drill-down path", () => {
    const toolRowIds = new Set(buildToolGroups({ go: () => {}, onEpisode: () => {}, phoneEnabled: true }).flatMap((g) => g.rows.map((r) => r.id)));
    const youRowIds = new Set(buildYouGroups().flatMap((g) => g.rows.map((r) => r.id)));
    const uncovered = KNOWN_AUX_VIEWS.filter((view) => (
      !toolRowIds.has(view) && !youRowIds.has(view) && !(view in DRILL_DOWN_ONLY) && !NOT_APPLICABLE.has(view)
    ));
    expect(uncovered, `these KNOWN_AUX_VIEWS entries have no row and no documented drill-down path: ${uncovered.join(", ")}`).toEqual([]);
  });
});
```

Run: `npx vitest run src/shell/scenes/ToolkitScene.reachability.test.ts`
Expected: 1 test PASS. If it fails, the failure message names exactly which `KNOWN_AUX_VIEWS` entries are uncovered — either a genuinely new gap (add it to `DRILL_DOWN_ONLY` with its real path, or `NOT_APPLICABLE` with why) or a sign `toolsRows.ts`/`youRows.ts` changed since this plan was written (re-verify the row id list against the current file).

- [ ] **Step 6: Run the `shell.boundary.test.ts` from Task 6 now that scene files exist**

Run: `npx vitest run src/shell/shell.boundary.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shell/scenes/ToolkitScene.tsx src/shell/scenes/ToolkitScene.test.tsx src/shell/scenes/ToolkitScene.reachability.test.ts
git commit -m "feat(shell): add ToolkitScene — hosts ToolsScreen + YouScreen wholesale

Includes a KNOWN_AUX_VIEWS reachability test that documents the 4 views
(caregiver/legal/safety_plan/guided_programs) reached via drill-down
paths rather than a top-level row — true of the legacy app too, not a
regression introduced here."
```

---

### Task 12: `QuietRoomShell` root — compose the ring, wire hardware back, replace the stub

**Files:**
- Modify: `src/shell/QuietRoomShell.tsx` (replace the Task 3 stub body)
- Create: `src/shell/QuietRoomShell.test.tsx`

**Interfaces:**
- Consumes: `SceneRing` (Task 6), `PresenceScene`/`TalkScene`/`CheckInScene`/`BreatheScene`/`ToolkitScene` (Tasks 7–11), `NavOverlays` (Task 2), `useActivateCrisis` (Task 1), `useNav`/`topOverlay` (`src/services/navStore.tsx`).
- Produces: `QuietRoomShell` — same no-props export shape as the Task 3 stub (so `App.tsx`'s flag branch needs no further changes).

- [ ] **Step 1: Write `QuietRoomShell.test.tsx` first — the back-handler contract**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NavProvider } from "../services/navStore";
import QuietRoomShell from "./QuietRoomShell";

afterEach(cleanup);

const listeners: Record<string, (data?: unknown) => void> = {};
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn((event: string, cb: (data?: unknown) => void) => {
      listeners[event] = cb;
      return Promise.resolve({ remove: vi.fn() });
    }),
    exitApp: vi.fn(),
  },
}));
vi.mock("../components/ModeScreen", () => ({ default: () => <div data-testid="talk-content" /> }));
vi.mock("../components/BreathingScreen", () => ({ default: () => <div data-testid="breathe-content" /> }));
vi.mock("../components/ToolsScreen", () => ({ default: () => <div data-testid="tools-content" /> }));
vi.mock("../components/YouScreen", () => ({ default: () => <div data-testid="you-content" /> }));
vi.mock("../services/notifications", () => ({ suppressNudgesForCrisis: vi.fn() }));

beforeEach(() => { for (const k of Object.keys(listeners)) delete listeners[k]; });

describe("QuietRoomShell — hardware back", () => {
  it("registers a backButton listener", async () => {
    render(<NavProvider><QuietRoomShell /></NavProvider>);
    await vi.waitFor(() => expect(listeners.backButton).toBeDefined());
  });

  it("always renders the crisis-help affordance", () => {
    render(<NavProvider><QuietRoomShell /></NavProvider>);
    expect(screen.getByRole("button", { name: /get help now/i })).toBeInTheDocument();
  });
});
```

Full simulation of "back while on scene 3 → scene 0" and "back while crisis open → crisis closes" requires driving `NavProvider`'s real reducer plus the mocked `backButton` callback together — write these two additional cases if the harness above proves stable in Step 4; if `@capacitor/app`'s mock shape doesn't match what `QuietRoomShell` imports (check `AppShell`'s existing `CapApp.addListener` usage at `App.tsx:321` for the exact shape first), adjust the mock to match rather than the implementation.

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/shell/QuietRoomShell.test.tsx`
Expected: FAIL (still rendering the Task 3 placeholder, no backButton listener registered, no HelpPill from a scene since the stub doesn't use SceneRing).

- [ ] **Step 3: Replace the `QuietRoomShell` stub body**

```tsx
import { useCallback, useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { useNav, topOverlay } from "../services/navStore";
import { useActivateCrisis } from "../hooks/useActivateCrisis";
import NavOverlays from "../components/NavOverlays";
import SceneRing from "./components/SceneRing";
import PresenceScene from "./scenes/PresenceScene";
import TalkScene from "./scenes/TalkScene";
import CheckInScene from "./scenes/CheckInScene";
import BreatheScene from "./scenes/BreatheScene";
import ToolkitScene from "./scenes/ToolkitScene";

const PRESENCE = 0, TALK = 1, CHECKIN = 2, BREATHE = 3, TOOLKIT = 4;

export default function QuietRoomShell() {
  const nav = useNav();
  const { state, openAux, openSheet, openCapture, closeTop } = nav;
  const activateCrisis = useActivateCrisis();
  const [activeIndex, setActiveIndex] = useState(PRESENCE);
  const [groundingExpandIndex, setGroundingExpandIndex] = useState<number | undefined>();
  const [selectedCaregiverContactId, setSelectedCaregiverContactId] = useState<string | undefined>();

  const captureOverlay = state.overlays.find((o) => o.kind === "capture");
  const activeCapture = captureOverlay?.kind === "capture" ? captureOverlay.id : null;
  const swipeLocked = state.overlays.some((o) => o.kind === "crisis");

  // Hardware back — mirrors AppShell's (App.tsx:318-334) close-overlay precedence exactly; only the
  // "root" destination differs: legacy roots to the Today TAB, this shell roots to the Presence SCENE.
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let removed = false;
    CapApp.addListener("backButton", () => {
      const top = topOverlay(state);
      if (top?.kind === "crisis") { closeTop(); return; }
      if (top?.kind === "sheet") { closeTop(); return; }
      if (top?.kind === "capture") { closeTop(); return; }
      if (top?.kind === "aux") { nav.closeAuxStart(); return; }
      if (activeIndex !== PRESENCE) { setActiveIndex(PRESENCE); return; }
      void CapApp.exitApp();
    }).then((h) => { handle = h; if (removed) h.remove(); });
    return () => { removed = true; handle?.remove(); };
  }, [state, activeIndex, closeTop, nav]);

  const onOpenGrounding = useCallback((expandIndex?: number) => { openSheet("grounding"); setGroundingExpandIndex(expandIndex); }, [openSheet]);

  const scenes = [
    { id: "presence", label: "Presence", content: <PresenceScene onOpenTalk={() => setActiveIndex(TALK)} /> },
    {
      id: "talk", label: "Talk", content: (
        <TalkScene
          onOpenSettings={() => openSheet("settings")}
          onOpenCrisis={activateCrisis}
          onOpenDashboard={() => openSheet("dashboard")}
          onOpenMedication={() => openSheet("medication")}
          onOpenGrounding={onOpenGrounding}
          onOpenDiary={() => openAux("diary")}
          onOpenReachOut={() => openAux("reach_out")}
          onOpenWindDown={() => openAux("winddown")}
          activeCapture={activeCapture}
          onOpenCapture={openCapture}
          onCloseCapture={closeTop}
        />
      ),
    },
    { id: "checkin", label: "Check-in", content: <CheckInScene /> },
    { id: "breathe", label: "Breathe", content: <BreatheScene onClose={() => setActiveIndex(PRESENCE)} /> },
    { id: "toolkit", label: "You", content: <ToolkitScene go={nav.go} onEpisode={() => nav.go("episode")} phoneEnabled onOpenCrisis={activateCrisis} /> },
  ];

  return (
    <div className="relative isolate">
      <SceneRing scenes={scenes} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex} onHelpPress={activateCrisis} swipeLocked={swipeLocked} />
      <NavOverlays
        groundingExpandIndex={groundingExpandIndex}
        setGroundingExpandIndex={setGroundingExpandIndex}
        selectedCaregiverContactId={selectedCaregiverContactId}
        setSelectedCaregiverContactId={setSelectedCaregiverContactId}
      />
    </div>
  );
}
```

Known, deliberately scoped gap (not a silent drop — documented here per the plan's own standard): this `QuietRoomShell` does not implement notification-tap routing, deep-link routing, onboarding/biometric/model-setup gates, the save-warning banner, or the wake-word listening indicator. All of those remain legacy-`AppShell`-only for now. This is acceptable because the flag defaults off and the only consumer while it's on is the developer dogfooding on a device that has already completed onboarding — it must be revisited before this shell is promoted to a user-facing Settings toggle (the spec's rollout Step 2).

- [ ] **Step 4: Run the test, iterate on the `@capacitor/app` mock shape if it doesn't match, until green**

Run: `npx vitest run src/shell/QuietRoomShell.test.tsx`
Expected: PASS. If the mock's `addListener` signature mismatches what `@capacitor/app` actually exports in this project, check how `App.tsx`'s own tests (if any) or the `@capacitor/app` type declarations shape `PluginListenerHandle`, and adjust the mock — not the implementation, which already matches `AppShell`'s proven pattern verbatim.

- [ ] **Step 5: Run the full suite, typecheck, build (both flag states)**

Run: `npx vitest run`
Expected: all PASS, including `shell.boundary.test.ts` and every shell test from Tasks 1–12.

Run: `npx tsc --noEmit && npx vite build && VITE_QUIET_ROOM_SHELL=true npx vite build`
Expected: both builds succeed.

- [ ] **Step 6: Commit**

```bash
git add src/shell/QuietRoomShell.tsx src/shell/QuietRoomShell.test.tsx
git commit -m "feat(shell): compose QuietRoomShell — real 5-scene ring, hardware back, crisis wiring

Presence/Talk/Check-in(placeholder)/Breathe/Toolkit, all mounted
simultaneously via SceneRing. Hardware back mirrors AppShell's
overlay-close precedence, rooting to Presence instead of the Today tab.
Notification-tap routing, deep-link routing, and onboarding/biometric
gates are deliberately out of scope for this dev-only flag (documented
in-file) — revisit before promoting to a user-facing toggle."
```

---

### Task 13: Full verification pass

**Files:** none created — this task only runs and reads output.

- [ ] **Step 1: Full test suite, both flag states**

Run: `npx vitest run`
Expected: every test green, including the pre-existing golden §9 suite and `nav.contract.test.ts` (both unmodified — confirm with `git diff --stat` that neither file appears in the diff for this plan).

- [ ] **Step 2: Typecheck and both builds**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vite build`
Expected: succeeds (default/legacy build).

Run: `VITE_QUIET_ROOM_SHELL=true npx vite build`
Expected: succeeds (new shell build).

- [ ] **Step 3: Confirm the legacy path is untouched at the behavior level**

Run: `git diff main -- src/App.tsx`
Expected: the diff shows only (a) the `AppLifecycle`/`NavOverlays`/`useActivateCrisis` extractions (code moved out, not changed), (b) the two duplicate-effect deletions, (c) the flag branch. No line inside the remaining `AppShell` body should differ in behavior from before Task 1 — read the diff line by line to confirm this by eye, since this is the plan's central safety invariant.

Run: `git diff main --stat -- 'src/**/*.test.ts' 'src/**/*.test.tsx' 'src/**/*.contract.test.ts' 'src/**/*.boundary.test.ts'`
Expected: only newly-created test files appear (every file this plan added in Tasks 1–12). Zero pre-existing test files should appear as *modified* — if one does, stop and treat it as a signal that a "verbatim move" task actually changed behavior somewhere (an existing test only needs edits if the thing it tests changed), not something to patch over by editing the test to match.

- [ ] **Step 4: Manual note for the user (not automatable in this environment)**

Record in the PR/commit description or hand off directly: device verification (hardware back during a live crisis takeover on the new shell; confirming Talk's §9 routing fires identically to the legacy path) is required before this shell is promoted to a user-facing Settings toggle, per the spec's rollout plan. This plan only gets the shell to a dev-flag-buildable, unit-tested state — it does not itself constitute the "device-verified" gate the spec requires for promotion.

- [ ] **Step 5: Final commit (if any cleanup was needed in Steps 1–3)**

```bash
git add -A
git commit -m "chore(shell): final verification pass for the Quiet Room shell foundation"
```

(Skip this commit if Steps 1–3 required no changes.)
