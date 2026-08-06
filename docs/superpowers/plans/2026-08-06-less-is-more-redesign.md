# Less-Is-More Redesign Implementation Plan (v1.28.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved spec `docs/superpowers/specs/2026-08-06-less-is-more-redesign-design.md` — declutter all 4 tabs, collapse duplicate surfaces into hubs, restore orphaned safety destinations, delete dead code — shipping as v1.28.0.

**Architecture:** Structural consolidation on the existing 4-tab shell. Row definitions become single-source (`toolsRows.ts`/`youRows.ts`); two new launcher screens (Calm hub, Skills hub) reduce Tools from 14 flat rows to 9 under 4 headers; Home gets an honest mood strip (prefill via a one-shot in-memory service) and a single bounded ambient slot; §9 crisis logic is never edited.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind v4 (semantic tokens) + vitest + Capacitor (Android).

## Global Constraints

Every task implicitly includes these. Violating one = stop and reassess.

1. **§9 frozen:** never edit `src/safety.ts`, `crisisClassifier.ts`, `CrisisOverlay.tsx`, `SoftCrisisCard.tsx`, `CrisisCard.tsx`, `CrisisLines.tsx`, `useCrisisGate`, the §9 golden tests (401), `safety.boundary.test.ts`, `secureData.boundary.test.ts`. `suppressNudgesForCrisis` latch semantics unchanged.
2. **No storage-key or data-format changes.** All writes on canonical keys go through the sanctioned writers (the write-boundary test enforces this).
3. **Test idioms:** component tests need `// @vitest-environment jsdom` pragma + `afterEach(cleanup)` (no global auto-cleanup); plain matchers (`.toBeTruthy()`, `.toBeNull()`) — jest-dom is NOT installed. 98 test files partially mock `secureLocal` — never add new exports to `secureLocal.ts`; new persistence helpers go in separate modules.
4. **ModeScreen stays prop-driven** (its test harness renders without a NavProvider).
5. **Parallel-dev discipline:** another session edits this tree. Before every commit: `git status`, stage ONLY the files this task touched (path-scoped `git add`), never `git add -A`. Files like `src/services/nilaInflection.*` belong to someone else — leave them.
6. **Read before edit:** re-read each target file at task start; line numbers in this plan are 2026-08-06 03:10 snapshots and WILL drift.
7. **No adversarial review passes** (user, 2026-08-06). Gates = targeted tests per task, full suite (`npm test`) + `npx tsc --noEmit` at each phase end.
8. **Copy rules:** no tool-id jargon in UI strings; new user-facing strings go through `t()` where the surrounding screen already does.
9. **Commits:** one per task, message prefix `feat(redesign):`/`refactor(redesign):`/`chore(redesign):`, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## Phase R1 — Foundation

### Task 1: Baseline + absorb the in-flight WIP

**Files:** no source edits; commits existing WIP.

- [ ] **Step 1:** Confirm the background baseline suite result (started 03:12). If red, list failures — fix ONLY failures caused by the WIP diff (TodayScreen/ToolsScreen/YouScreen/ModeScreen/App/recentTools/capacitor.config/secureLocal/protectedLiterals/i18n + their tests); anything else is pre-existing → note and continue.
- [ ] **Step 2:** `npx tsc --noEmit` → expect clean.
- [ ] **Step 3:** Commit the WIP path-scoped:

```bash
git add src/components/TodayScreen.tsx src/components/TodayScreen.test.tsx \
  src/components/ToolsScreen.tsx src/components/YouScreen.tsx src/components/YouScreen.test.tsx \
  src/components/ModeScreen.tsx src/components/ModeScreen.test.tsx src/App.tsx \
  src/services/recentTools.ts src/services/recentTools.test.ts src/services/secureLocal.ts \
  src/services/i18n.ts src/services/protectedLiterals.test.ts capacitor.config.ts \
  docs/SENIOR_DESIGNER_REVIEW.md
git commit -m "feat(redesign): absorb less-is-more WIP — small avatar, Home rename, Recently/Pinned, rating card to Home"
```

(If `git status` shows other WIP files in that diff set — e.g. Sheet.tsx, InsightsScreen.tsx per the review commits — include them; exclude `nilaInflection.*`.)

### Task 2: Crisis Help pill on all 4 tabs + presence test

**Files:**
- Modify: `src/components/ToolsScreen.tsx` (destructure `onOpenCrisis`, header)
- Modify: `src/components/YouScreen.tsx` (new prop + header)
- Modify: `src/App.tsx` (pass `onOpenCrisis={activateCrisis}` to YouScreen, ~line 505)
- Test: `src/components/crisisPresence.test.tsx` (create)

**Interfaces:** `YouScreen` props become `{ go: (target: string) => void; onOpenCrisis: () => void }`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
// Redesign acceptance #3: the crisis Help pill is present on every tab (v1.20.10 invariant,
// regressed when Tools/You were rebuilt). Nila's pill lives in NilaHeader (covered there).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TodayScreen from "./TodayScreen";
import ToolsScreen from "./ToolsScreen";
import YouScreen from "./YouScreen";

vi.mock("../services/secureLocal", () => ({
  secureLocal: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

const HELP_LABEL = "Get help now — crisis resources and support";
afterEach(cleanup);

describe("crisis pill presence (all tabs)", () => {
  it("TodayScreen renders the Help pill", () => {
    render(<TodayScreen go={() => {}} phoneEnabled={true} onEpisode={() => {}} onOpenCrisis={() => {}} />);
    expect(screen.getByLabelText(HELP_LABEL)).toBeTruthy();
  });
  it("ToolsScreen renders the Help pill", () => {
    render(<ToolsScreen go={() => {}} phoneEnabled={true} onEpisode={() => {}} onOpenCrisis={() => {}} />);
    expect(screen.getByLabelText(HELP_LABEL)).toBeTruthy();
  });
  it("YouScreen renders the Help pill", () => {
    render(<YouScreen go={() => {}} onOpenCrisis={() => {}} />);
    expect(screen.getByLabelText(HELP_LABEL)).toBeTruthy();
  });
});
```

(If other mocks are needed to render — e.g. `useUserContext`, `chatSuggestions` — mock them the way `TodayScreen.test.tsx` / existing screen tests do; copy their mock blocks.)

- [ ] **Step 2:** `npx vitest run src/components/crisisPresence.test.tsx` → expect Tools + You FAIL (pill missing), Today PASS.
- [ ] **Step 3:** ToolsScreen — destructure `onOpenCrisis` and put the pill in the header:

```tsx
export default function ToolsScreen({ go, onEpisode, phoneEnabled, onOpenCrisis }: Props) {
```

```tsx
<header className="pt-2 flex items-start justify-between">
  <div className="space-y-1">
    <h1 className="editorial text-[26px] text-ink tracking-tight">Tools</h1>
    <p className="text-[12px] text-ink-muted">Skills, trackers, and practices.</p>
  </div>
  <CrisisHeaderButton onClick={onOpenCrisis} />
</header>
```

Add `import CrisisHeaderButton from "./CrisisHeaderButton";`.

- [ ] **Step 4:** YouScreen — add prop and a matching header above the streak card:

```tsx
export default function YouScreen({ go, onOpenCrisis }: { go: (target: string) => void; onOpenCrisis: () => void }) {
```

```tsx
<header className="pt-2 flex items-start justify-between">
  <h1 className="editorial text-[26px] text-ink tracking-tight">{t("you")}</h1>
  <CrisisHeaderButton onClick={onOpenCrisis} />
</header>
```

Import `CrisisHeaderButton` and `t` (i18n import already partially present via `useLanguage`).

- [ ] **Step 5:** App.tsx — `<YouScreen go={go} onOpenCrisis={activateCrisis} />`.
- [ ] **Step 6:** `npx vitest run src/components/crisisPresence.test.tsx src/components/YouScreen.test.tsx src/components/TodayScreen.test.tsx` → PASS. `npx tsc --noEmit` → clean.
- [ ] **Step 7:** Commit: `feat(redesign): restore crisis Help pill on Tools + You (all-4-tabs invariant) + presence test`.

**Phase R1 gate:** `npm test` full suite green.

---

## Phase R2 — Home

### Task 3: Honest mood strip (tap carries the mood into check-in)

**Files:**
- Create: `src/services/emaPrefill.ts`
- Test: `src/services/emaPrefill.test.ts` (create)
- Modify: `src/components/EmaCheckIn.tsx` (consume prefill in initializers)
- Modify: `src/components/TodayScreen.tsx` (set prefill on tap)

**Interfaces:** Produces `setEmaPrefill(valence: number): void` and `consumeEmaPrefill(): number | null` (one-shot; second call returns null). EmaCheckIn valence vocabulary: `-3 | -1 | 0 | 1 | 3`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { setEmaPrefill, consumeEmaPrefill } from "./emaPrefill";

describe("emaPrefill", () => {
  it("hands the value over exactly once", () => {
    setEmaPrefill(-1);
    expect(consumeEmaPrefill()).toBe(-1);
    expect(consumeEmaPrefill()).toBeNull();
  });
  it("returns null when nothing was set", () => {
    expect(consumeEmaPrefill()).toBeNull();
  });
  it("last write wins", () => {
    setEmaPrefill(3);
    setEmaPrefill(0);
    expect(consumeEmaPrefill()).toBe(0);
  });
});
```

- [ ] **Step 2:** Run → FAIL (module missing).
- [ ] **Step 3: Implement**

```ts
// One-shot in-memory handoff from the Home mood strip to EmaCheckIn (redesign §5.1).
// The tapped face IS the valence answer — the check-in must not re-ask it. In-memory only:
// a mood tap is not persisted until the person completes the check-in (no new storage key).
let pending: number | null = null;

export function setEmaPrefill(valence: number): void {
  pending = valence;
}

/** Returns the pending valence once, then clears it. */
export function consumeEmaPrefill(): number | null {
  const v = pending;
  pending = null;
  return v;
}
```

- [ ] **Step 4:** EmaCheckIn.tsx — consume in the state initializers (top of component):

```tsx
import { consumeEmaPrefill } from "../services/emaPrefill";
// …
export default function EmaCheckIn({ onLogged, onCrisis }: { onLogged?: () => void; onCrisis?: () => void }) {
  const [prefill] = useState<number | null>(() => consumeEmaPrefill());
  const [step, setStep] = useState<"valence" | "energy" | "note">(prefill !== null ? "energy" : "valence");
  const [valence, setValence] = useState<number | null>(prefill);
```

(Replace the two existing `useState` lines for `step`/`valence`; everything else untouched — the §9 note-scan in `saveAndClose` must remain byte-identical.)

- [ ] **Step 5:** TodayScreen.tsx — map mood ids to EMA valence and set before navigating. `MOOD_OPTIONS` ids ↔ the inverse of EmaCheckIn's `emaValenceToMood`:

```tsx
import { setEmaPrefill } from "../services/emaPrefill";

const MOOD_TO_VALENCE: Record<(typeof MOOD_OPTIONS)[number]["id"], number> = {
  calm: 3, good: 1, okay: 0, anxious: -1, overwhelmed: -3,
};
```

Button onClick becomes: `onClick={() => { setEmaPrefill(MOOD_TO_VALENCE[mood.id]); go("ema_checkin"); }}`.

- [ ] **Step 6: Component test** — add to `src/components/EmaCheckIn.test.tsx` if it exists (else create with jsdom pragma + cleanup, mocking `../services/ema`, `../services/checkin`, `../safety` per Global Constraint 3):

```tsx
it("skips the valence step when a prefill is pending", () => {
  setEmaPrefill(-3);
  render(<EmaCheckIn />);
  expect(screen.queryByText("How are you right now?")).toBeTruthy();
  expect(document.getElementById("ema-valence")).toBeNull();     // valence grid skipped
  expect(screen.getByText("Your energy?")).toBeTruthy();          // lands on energy step
});
```

- [ ] **Step 7:** Run EmaCheckIn + TodayScreen + emaPrefill tests → PASS. tsc clean.
- [ ] **Step 8:** Commit: `feat(redesign): Home mood tap carries into check-in (one-shot prefill, no re-ask)`.

### Task 4: Single ambient slot on Home

**Files:**
- Create: `src/components/AmbientSlot.tsx`
- Create: `src/hooks/useAmbientSignals.ts`
- Test: `src/components/AmbientSlot.test.tsx` (create)
- Modify: `src/components/TodayScreen.tsx` (replace `<RatingPromptCard />` with `<AmbientSlot go={go} />`)

**Interfaces:**
- `useAmbientSignals(): { safetyPlanCard: "review" | "followup" | null; sleepNudge: { firing: boolean; detail: string } | null; completeReview(): void; completeFollowUp(): void; dismissSleep(): void; suppressed: boolean }`
- `AmbientSlot({ go }: { go: (target: string) => void })` renders **at most one** card.

- [ ] **Step 1:** Read `src/hooks/useNudges.ts` end-to-end. Identify the service calls that compute (a) the safety-plan review/followup card state, (b) the sleep-prodrome nudge, and (c) the crisis-suppression check (`suppressNudgesForCrisis` counterpart read). Lift those computations VERBATIM (same service functions, same mount-time evaluation) into `useAmbientSignals` — service-based signals only; do NOT lift anything that needs `messages`, `auxView`, or `hadCrisisRef` (chat-context signals — jitai/calm/pact/welcome — stay out of the slot; jitai's live surface remains DashboardScreen). `useNudges.ts` itself is NOT edited.
- [ ] **Step 2: Write the failing test**

```tsx
// @vitest-environment jsdom
// Redesign §5.1: the ambient slot is the ONLY place a prompt card may appear on Home, capped at 1.
// Priority: safety-plan followup > review > sleep > rating. Crisis suppression blanks everything.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const signals = {
  safetyPlanCard: null as "review" | "followup" | null,
  sleepNudge: null as { firing: boolean; detail: string } | null,
  completeReview: vi.fn(), completeFollowUp: vi.fn(), dismissSleep: vi.fn(),
  suppressed: false,
};
vi.mock("../hooks/useAmbientSignals", () => ({ useAmbientSignals: () => signals }));
vi.mock("../services/ratingPrompt", () => ({
  shouldPromptRating: () => true, dismissRatingPrompt: vi.fn(), onUserRated: vi.fn(),
}));
import AmbientSlot from "./AmbientSlot";

afterEach(() => { cleanup(); signals.safetyPlanCard = null; signals.sleepNudge = null; signals.suppressed = false; });

describe("AmbientSlot", () => {
  it("renders only the highest-priority card (followup beats sleep + rating)", () => {
    signals.safetyPlanCard = "followup";
    signals.sleepNudge = { firing: true, detail: "short sleep 3 nights" };
    render(<AmbientSlot go={() => {}} />);
    expect(document.getElementById("safety-plan-followup-card")).toBeTruthy();
    expect(document.getElementById("sleep-prodrome-card")).toBeNull();
    expect(document.getElementById("rating-prompt-card")).toBeNull();
  });
  it("falls through to the rating prompt when nothing else fires", () => {
    render(<AmbientSlot go={() => {}} />);
    expect(document.getElementById("rating-prompt-card")).toBeTruthy();
  });
  it("renders nothing while crisis suppression is latched", () => {
    signals.safetyPlanCard = "review";
    signals.suppressed = true;
    const { container } = render(<AmbientSlot go={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 3:** Run → FAIL (module missing).
- [ ] **Step 4: Implement AmbientSlot.tsx.** Priority ladder `followup > review > sleep > rating`; card markup for followup/review/sleep is MOVED from `NudgeRail.tsx` (keep the exact element ids `safety-plan-followup-card`, `safety-plan-review-card`, `sleep-prodrome-card`, copy, classes, and 44px buttons verbatim — the e2e harness keys on the ids). "Review plan"/"Fill it in" buttons call `go("safety_plan")` then `completeReview()`/`completeFollowUp()` exactly as NudgeRail's props did; sleep's "Wind down" calls `go("winddown")`; rating fallback renders the existing `<RatingPromptCard />` unchanged. When `suppressed`, return `null` before any branch.
- [ ] **Step 5:** TodayScreen: replace `<RatingPromptCard />` with `<AmbientSlot go={go} />`; drop the now-unused RatingPromptCard import (it moves inside AmbientSlot).
- [ ] **Step 6:** Run AmbientSlot + TodayScreen tests → PASS. tsc clean.
- [ ] **Step 7:** Commit: `feat(redesign): single bounded ambient slot on Home (followup>review>sleep>rating, crisis-suppressed)`.

### Task 5: Recently list records tap-through

**Files:** Modify `src/components/TodayScreen.tsx`; extend `src/components/TodayScreen.test.tsx`.

- [ ] **Step 1:** Failing test (TodayScreen.test.tsx idiom — mock `../services/recentTools` with `vi.fn()`s):

```tsx
it("re-using a Recently tool refreshes its recency", () => {
  // arrange getRecentTools → [{ target: "winddown", timestamp: Date.now() }]
  render(<TodayScreen go={go} phoneEnabled={true} onEpisode={() => {}} onOpenCrisis={() => {}} />);
  fireEvent.click(screen.getByText("Wind Down"));
  expect(recordToolUse).toHaveBeenCalledWith("winddown");
  expect(go).toHaveBeenCalledWith("winddown");
});
```

- [ ] **Step 2:** Run → FAIL. Fix: `onPress={() => { recordToolUse(entry.target); go(entry.target); }}` in the Recently map.
- [ ] **Step 3:** Run → PASS. Commit: `fix(redesign): Recently tap-through records tool use`.

**Phase R2 gate:** full suite + tsc green.

---

## Phase R3 — Tools

### Task 6: Shared tool metadata registry

**Files:**
- Create: `src/components/toolMeta.ts`
- Test: `src/components/toolMeta.test.ts`
- Modify: `src/components/TodayScreen.tsx` (delete local `TOOL_META`, import shared)
- Modify: `src/components/ToolsScreen.tsx` (Pinned uses real icons via registry)

**Interfaces:** Produces `TOOL_META: Record<string, { Icon: LucideIcon; iconClass: string; label: () => string }>` covering every recordable target id: `plan, winddown, sounds, reach_out, episode, safety_plan, ema_checkin, diary, medication, assessment, problem_solving, values_to_action, social_rhythm, exposure, relapse_plan, chain_analysis, guided_programs, calm_hub, skills_hub, dashboard`. `label()` defers to `t()` keys where they exist (`tool_winddown_label` etc.), literal strings elsewhere (matching today's row labels). Plain data (icon refs, not JSX) so it tests in node env.

- [ ] **Step 1:** Failing test: every id above present; `label()` returns non-empty; `Icon` defined; spot-check `TOOL_META.winddown.label()` equals `t("tool_winddown_label")`.
- [ ] **Step 2:** Implement (icons copied from today's `toolsRows.ts`/`TodayScreen.TOOL_META` rows; hub ids use `Wind` for calm_hub, `Lightbulb` for skills_hub, `ShieldCheck` for safety_plan, `LifeBuoy` + `text-rose-400`→`text-danger` for episode).
- [ ] **Step 3:** TodayScreen Recently + ToolsScreen Pinned resolve icon/label via `TOOL_META[id]` (Pinned drops the generic `Pin` icon; keep `Pin` import removed). Unknown id → skip row (current behavior).
- [ ] **Step 4:** Targeted tests + tsc → PASS. Commit: `refactor(redesign): shared TOOL_META registry for Recently/Pinned (real icons, node-testable)`.

### Task 7: Calm hub + Skills hub screens and routes

**Files:**
- Create: `src/components/CalmHubScreen.tsx`, `src/components/SkillsHubScreen.tsx`
- Test: `src/components/CalmHubScreen.test.tsx`, `src/components/SkillsHubScreen.test.tsx`
- Modify: `src/services/nav.ts` (AuxView union + KNOWN_AUX_VIEWS + `calm_hub`, `skills_hub`)
- Modify: `src/App.tsx` (AUX_LABELS entries + renderAuxView cases)
- Modify: `src/services/nav.contract.test.ts` (deliberate golden update)

**Interfaces:** Both screens take `{ go: (target: string) => void }`. renderAuxView passes its existing `onOpenView` param as `go` (it accepts any target string). Rows call `recordToolUse(childId)` then `go(childId)`.

- [ ] **Step 1: Failing tests** (one per screen, jsdom pragma + cleanup; mock `../services/recentTools`):

```tsx
it("lists the three calm destinations and routes + records on tap", () => {
  render(<CalmHubScreen go={go} />);
  fireEvent.click(screen.getByText("Breathing & Grounding"));
  expect(recordToolUse).toHaveBeenCalledWith("plan");
  expect(go).toHaveBeenCalledWith("plan");
  expect(screen.getByText("Wind Down")).toBeTruthy();
  expect(screen.getByText("Ambient sounds")).toBeTruthy();
});
```

SkillsHub asserts 7 rows: Problem solving, Values work, Social rhythm, Exposure hierarchy, Relapse prevention, Chain Analysis, Guided programs — each `recordToolUse(id)` + `go(id)`; labels via `TOOL_META[id].label()`.

- [ ] **Step 2:** Run → FAIL. Implement both as ToolRow launchers (GuidedProgramsScreen's launcher pattern, `ToolRow` rows):

```tsx
import ToolRow from "./ToolRow";
import { TOOL_META } from "./toolMeta";
import { recordToolUse } from "../services/recentTools";

const CALM_CHILDREN = ["plan", "winddown", "sounds"] as const;

export default function CalmHubScreen({ go }: { go: (target: string) => void }) {
  return (
    <div className="p-4 space-y-2" id="calm-hub">
      <p className="text-sm text-ink-muted pb-2">A quieter minute, whichever way works right now.</p>
      {CALM_CHILDREN.map((id) => {
        const m = TOOL_META[id];
        return (
          <ToolRow key={id} icon={<m.Icon className={m.iconClass} aria-hidden="true" />} label={m.label()}
            onPress={() => { recordToolUse(id); go(id); }} />
        );
      })}
    </div>
  );
}
```

SkillsHubScreen identical shape with `const SKILL_CHILDREN = ["problem_solving", "values_to_action", "social_rhythm", "exposure", "relapse_plan", "chain_analysis", "guided_programs"] as const;`, intro copy `"Structured practices — go at your own pace."`, id `skills-hub`. (Check `ToolRow.tsx` props at exec: if `subtitle` is required, pass the existing `sub` copy from toolsRows via a `sub()` added to TOOL_META in Task 6.)

- [ ] **Step 3:** nav.ts — add `| "calm_hub" | "skills_hub"` to `AuxView`, append both to `KNOWN_AUX_VIEWS`. App.tsx — `AUX_LABELS: calm_hub: "Calm", skills_hub: "Skills & programs"`; renderAuxView: `case "calm_hub": return <CalmHubScreen go={onOpenView} />;` / `case "skills_hub": return <SkillsHubScreen go={onOpenView} />;`
- [ ] **Step 4:** `npx vitest run src/services/nav.contract.test.ts` → FAILS on the golden list. Update the pinned `KNOWN_AUX_VIEWS` golden to include both ids **as a deliberate reviewed edit** (this is the contract test doing its job) and assert both round-trip through `resolveNavTarget` as `{kind:"aux"}` like the others.
- [ ] **Step 5:** All targeted tests + tsc → PASS. Commit: `feat(redesign): Calm + Skills hub launchers with routes (guided programs reachable again)`.

### Task 8: Tools tab — 4 sections, 9 rows, single source

**Files:**
- Modify: `src/components/toolsRows.ts` (regroup)
- Modify: `src/components/toolsRows.test.ts` (deliberate golden update)
- Modify: `src/components/ToolsScreen.tsx` (render groups directly; delete SECTIONS)
- Modify: `src/services/i18n.ts` (new keys ×4 locales)

**Interfaces:** `buildToolGroups({go, onEpisode, phoneEnabled})` now returns exactly 4 groups; `personalizeToolOrder`/`personalizeToolByContext` signatures unchanged (their id lists updated: `plan`→`calm_hub` where a promoted id is now a hub child — promote the HUB instead: replace `plan` with `calm_hub`, `winddown` with `calm_hub` in TIME/STATE/GOAL priority maps, dedupe).

- [ ] **Step 1:** Update `toolsRows.test.ts` FIRST to pin the new shape (it is the golden): 4 groups titled `t("tool_group_moment")`, `t("tool_group_calm")`, `t("tool_group_log")`, `t("tool_group_skills")`; row ids exactly `[["episode","safety_plan"],["calm_hub","reach_out"],["ema_checkin","diary","medication"],["assessment","skills_hub"]]`; no `more` flags; `episode` row still calls `onEpisode` (not `go`). Run → FAIL.
- [ ] **Step 2:** Rewrite `buildToolGroups` to that shape. New rows:

```ts
{ id: "safety_plan", label: t("tool_safety_plan_label"), sub: t("tool_safety_plan_sub"), Icon: ShieldCheck, iconClass: "w-5 h-5 text-success", onTap: () => go("safety_plan") },
{ id: "calm_hub", label: t("tool_calm_hub_label"), sub: t("tool_calm_hub_sub"), Icon: Wind, iconClass: "w-5 h-5 text-accent", onTap: () => go("calm_hub") },
{ id: "skills_hub", label: t("tool_skills_hub_label"), sub: t("tool_skills_hub_sub"), Icon: Lightbulb, iconClass: "w-5 h-5 text-warn", onTap: () => go("skills_hub") },
```

`diary` row's sub becomes `t("tool_diary_sub")` with updated copy (below). Delete the `phoneEnabled` dashboard group (Patterns lives on You; keep the `phoneEnabled` param in `ToolRowDeps` to avoid churn). `episode` iconClass `text-rose-400` → `text-danger`.

- [ ] **Step 3:** i18n.ts — add keys to ALL FOUR locales next to the existing `tool_*` block, following its exact structure. en values: `tool_group_calm: "Calm"`, `tool_safety_plan_label: "Safety plan"`, `tool_safety_plan_sub: "Your steps for the hardest moments — ready before you need them"`, `tool_calm_hub_label: "Calm"`, `tool_calm_hub_sub: "Breathing, grounding, wind down, and sounds"`, `tool_skills_hub_label: "Skills & programs"`, `tool_skills_hub_sub: "Structured practices, step by step"`; hi/ta/te translated in the register of the neighboring existing translations (match how `tool_winddown_*`/`tool_reach_out_*` are phrased in each locale; keep clinical terms consistent with existing usage).
- [ ] **Step 4:** ToolsScreen — delete `SECTIONS` + `sectionRows` + the `allRows` flatten; render:

```tsx
{groups.map((g) => (
  <Section key={g.title} title={g.title}>
    {g.rows.map((r) => (
      <ToolRow key={r.id} icon={<r.Icon className={r.iconClass} aria-hidden="true" />} label={r.label}
        subtitle={r.sub} onPress={() => { recordToolUse(r.id); r.onTap(); }} />
    ))}
  </Section>
))}
```

- [ ] **Step 5:** Update the personalization priority maps per Interfaces note; their existing unit tests updated in the same deliberate pass (they pin promoted ids).
- [ ] **Step 6:** Run toolsRows + ToolsScreen + personalization tests → PASS. tsc clean. Manually verify in browser (vite :3100 serves THIS tree): Tools shows 4 sections/9 rows; Episode support opens; Safety plan opens.
- [ ] **Step 7:** Commit: `feat(redesign): Tools = 4 sections, 9 rows, single-source; episode + safety plan restored`.

### Task 9: Journal hub (thought record joins; duplicate route retired)

**Files:**
- Modify: `src/components/JournalScreen.tsx` (third tab)
- Modify: `src/App.tsx`, `src/services/nav.ts`, `src/services/nav.contract.test.ts`
- Test: extend `src/components/JournalScreen.test.tsx` (or create)

- [ ] **Step 1:** Read `JournalScreen.tsx` (295 lines). Add a third internal tab `thoughtRecord` labeled "Thought record" rendering `<ThoughtRecordScreen />` (it renders prop-less in renderAuxView today, so it composes; verify no `onClose` requirement — if it needs one, pass a no-op and keep its own internal flow). `defaultTab` prop union widens to `"freeWrite" | "dbtCard" | "thoughtRecord"`.
- [ ] **Step 2:** Failing test: render `<JournalScreen />`, click "Thought record" tab, assert ThoughtRecordScreen's root appears (mock heavy services the existing JournalScreen/ThoughtRecordScreen tests mock — copy their vi.mock blocks).
- [ ] **Step 3:** `grep -rn '"dbt_diary_card"\|"thought_record"' src --include="*.ts*" | grep -v test`. For each caller outside nav plumbing: `dbt_diary_card` callers → `go("diary")` (JournalScreen defaultTab handles the rest via a small `openJournalTab` helper if a caller needs the DBT tab specifically — if any non-notification caller needs it, keep `dbt_diary_card` as an ALIAS in `resolveNavTarget` mapping to `{kind:"aux", view:"diary"}` instead of deleting; notification deep-links MUST keep working). `thought_record` aux callers → `diary` (hub) EXCEPT ModeScreen's capture sheet (a different, §9-gated surface — untouched).
- [ ] **Step 4:** If zero external callers: remove `dbt_diary_card` from AuxView/KNOWN_AUX_VIEWS/AUX_LABELS/renderAuxView; update nav.contract golden (deliberate). If callers exist: alias route (keep union member, resolveNavTarget maps it to diary) and document in-code.
- [ ] **Step 5:** Tests + tsc → PASS. Commit: `feat(redesign): Journal hub — free write, DBT card, thought record in one place`.

**Phase R3 gate:** full suite + tsc + browser walk of every Tools row.

---

## Phase R4 — You

### Task 10: YouScreen renders from youRows (curated, i18n'd)

**Files:**
- Modify: `src/components/youRows.ts` (curate to 6 rows / 2 groups)
- Modify: `src/components/youRows.test.ts` (golden update)
- Modify: `src/components/YouScreen.tsx` (render `buildYouGroups()`)
- Modify: `src/services/i18n.ts` (label copy change for dashboard row)

**Interfaces:** `buildYouGroups()` returns `[{title: t("you_group_manage"), rows: [dashboard, your_data, settings, caregiver_settings]}, {title: t("you_group_resources"), rows: [nila_memory, learn]}]`. Removed ids: `progress`, `about_nila`, `insights`, `thought_record`, `episode_marker`. No `more` flags remain. `you_dashboard_label` copy becomes "Patterns" (all 4 locales), sub "Trends, signals, and your daily overview".

- [ ] **Step 1:** Update `youRows.test.ts` to pin the new 6-row shape → FAIL.
- [ ] **Step 2:** Curate `youRows.ts` (delete removed rows + the `more` doc-comment references; `nila_memory` iconClass `text-fuchsia-400` → `text-accent-hi`).
- [ ] **Step 3:** YouScreen: delete the 7 hardcoded ToolRows; render:

```tsx
{buildYouGroups().map((g) => (
  <Section key={g.title} title={g.title}>
    {g.rows.map((r) => (
      <ToolRow key={r.id} icon={<r.Icon className={r.iconClass} aria-hidden="true" />} label={r.label}
        subtitle={r.sub} onPress={() => go(r.id)} />
    ))}
  </Section>
))}
```

Keep streak card, dataErrors banner, Task-2 header. Update `YouScreen.test.tsx` expectations (it asserted old rows).

- [ ] **Step 4:** i18n dashboard-label copy ×4 locales. Tests + tsc → PASS.
- [ ] **Step 5:** Commit: `feat(redesign): You tab single-source (6 rows, i18n) — youRows divergence closed`.

### Task 11: About Nila into Settings; Insights merged into Patterns

**Files:**
- Modify: `src/components/SettingsScreen.tsx` (About Nila row)
- Modify: `src/App.tsx` (pass opener; remove insights case if orphaned)
- Modify: `src/services/nav.ts` + `nav.contract.test.ts` (route removals — deliberate)
- Delete (this task or R6): `src/components/InsightsScreen.tsx`, `src/components/ProgressDashboard.tsx`

- [ ] **Step 1:** Read `SettingsScreen.tsx`; add an "About Nila" row (matching its existing row idiom) calling a new `onOpenAbout?: () => void` prop; App's settings `<Sheet>` passes `onOpenAbout={() => openAux("about_nila")}` (stacked overlays are supported — capture/crisis ordering tests prove the stack).
- [ ] **Step 2:** Before deleting Insights: `grep -rn '"insights"' src --include="*.ts*" | grep -v test | grep -v i18n` → expect only nav plumbing + (removed) youRows row. Diff `InsightsScreen.tsx` content against DashboardScreen's bands; fold anything genuinely unique into DashboardScreen (expected: none — both render `patternInsights.generateInsights` + mood history). If something unique exists, move it as-is into a Dashboard band section.
- [ ] **Step 3:** Remove `insights` + `progress` from AuxView/KNOWN_AUX_VIEWS/AUX_LABELS/renderAuxView; delete `InsightsScreen.tsx` + `ProgressDashboard.tsx` + their tests; update nav.contract golden (deliberate).
- [ ] **Step 4:** Full grep for stale imports; tests + tsc → PASS. Commit: `feat(redesign): About→Settings; Insights+Progress merged into Patterns (dashboard)`.

**Phase R4 gate:** full suite + tsc + browser walk of You rows + Settings→About.

---

## Phase R5 — Nila

### Task 12: Suggestion chips — max 3, horizontal scroll, no hidden toggle

**Files:** Modify `src/components/ModeScreen.tsx` (chips block); extend `ModeScreen.test.tsx` ONLY if it already asserts chip behavior (otherwise add a characterization test in a new small file per Constraint 3).

- [ ] **Step 1:** Locate the chips block (`grep -n "more\|chip" src/components/ModeScreen.tsx`, look for the expand/collapse state from the review's "+2 more"). Read the block + its state.
- [ ] **Step 2:** Replace expand state + "+N more" button with a scroll strip rendering the first 3 suggestions:

```tsx
<div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1" role="list" aria-label="Suggestions">
  {suggestions.slice(0, 3).map(/* existing chip button JSX unchanged */)}
</div>
```

(Keep each chip's existing onClick/handler names exactly; delete the expand state variable + toggle button; if a `scrollbar-none` utility doesn't exist in index.css, use the existing pattern other horizontal scrollers in the app use — grep `overflow-x-auto` for precedent.)

- [ ] **Step 3:** ModeScreen.test.tsx must stay green UNTOUCHED unless it pinned "+N more" explicitly (then updating it is the deliberate part of this task). Run ModeScreen tests + §9 goldens (`npx vitest run src/components/ModeScreen.test.tsx` + golden suite command from package.json scripts) → PASS.
- [ ] **Step 4:** Commit: `feat(redesign): suggestion chips — 3 visible, scrollable, nothing hidden`.

### Task 13: New-chat confirm → shared ConfirmDialog

**Files:** Modify `src/components/ModeScreen.tsx`; read `src/components/ConfirmDialog.tsx` first.

- [ ] **Step 1:** Read ConfirmDialog's props. Locate ModeScreen's hand-rolled `confirmNewChat` fixed-inset dialog. Replace the JSX with `<ConfirmDialog …/>` mapping title/body/confirm/cancel handlers 1:1 (open state variable and handlers keep their names; copy text byte-identical).
- [ ] **Step 2:** If ConfirmDialog lacks focus-trap/aria parity with the hand-rolled version (check for `role="dialog"`, `aria-modal`, focus handling), add the missing aria attributes TO ConfirmDialog (shared improvement, all consumers benefit).
- [ ] **Step 3:** ModeScreen tests + §9 goldens → PASS (harness untouched). Commit: `refactor(redesign): ModeScreen new-chat confirm uses shared ConfirmDialog`.

**Phase R5 gate:** full suite + tsc; browser: chat renders, chips scroll, new-chat confirm works, check-in card unchanged.

---

## Phase R6 — Sweep + ship

### Task 14: Dead-code deletion (grep-gated)

**Files:** Delete candidates (each ONLY if `grep -rn "<Name>" src --include="*.ts*" | grep -v "components/<Name>"` shows zero non-test consumers at deletion time):
`TodayWidgets.tsx, IntentFlowBar.tsx, MoodBar.tsx, OnboardingMomentum.tsx, PullToRefresh.tsx, lowFrictionReCheckIn.tsx, ConversationalCheckinCard.tsx, DailyContentCard.tsx, ProactiveNudgeRail.tsx, PleaseAuditNudgeCard.tsx, NudgeRail.tsx, SafetyPlanNudgeCard.tsx, PactNoticeCard.tsx, EpisodeMarkerScreen.tsx` + each one's test file.

- [ ] **Step 1:** Run the grep per candidate; record the verdict list in the commit body. NudgeRail is deletable only after Task 4 moved its card markup. PactNoticeCard/EpisodeMarkerScreen: if ANY live consumer (ModeScreen inline render, DashboardScreen band, notification route) → keep, note why.
- [ ] **Step 2:** Delete confirmed orphans + tests; `npx tsc --noEmit` (catches stale imports the grep missed) + full suite → green.
- [ ] **Step 3:** Commit: `chore(redesign): delete N orphaned components (grep-verified zero consumers)`.

### Task 15: Token tail in touched files

- [ ] **Step 1:** `grep -rnE "text-(rose|orange|cyan|green|fuchsia|amber|sky|violet|indigo)-[0-9]" $(git diff --name-only main...HEAD | grep -E '\.tsx?$')` — migrate each hit in REDESIGN-TOUCHED files to the semantic token that today resolves to the same remapped value (`orange-400`→`warn-hi`, `green-400`→`success`, `cyan-400`→`success-hi`, `fuchsia-400`→`accent-hi`, `rose-*` in crisis components → danger-family ONLY after verifying identical computed color in the built CSS both themes; else leave + inline comment).
- [ ] **Step 2:** Browser-verify both themes on the changed screens (dark + `:root.theme-light`). Suite + tsc → green. Commit: `refactor(redesign): finish semantic-token migration in redesign-touched files`.

### Task 16: AUX_LABELS localization

**Files:** Modify `src/App.tsx` (AUX_LABELS values → `t()`), `src/services/i18n.ts` (keys ×4 locales).

- [ ] **Step 1:** For each AUX_LABELS entry, reuse an existing translated key when one matches the same string (e.g. winddown ≡ `tool_winddown_label`, settings sheet already uses `t("settings")`); add `aux_<view>` keys only for the remainder. AUX_LABELS values become `t("…")` calls — verify App re-renders on language change (it already subscribes via `LANGUAGE_CHANGED_EVENT`, App.tsx ~line 238).
- [ ] **Step 2:** `protectedLiterals.test.ts` and any copy-pinning tests: update deliberately if they pin English sheet titles.
- [ ] **Step 3:** Suite + tsc → green. Commit: `feat(redesign): localize sheet titles (AUX_LABELS) en/hi/ta/te — closes Jul-19 gap`.

### Task 17: a11y + device verification, version, ship

- [ ] **Step 1:** Run the existing e2e Playwright+axe harness (see `e2e/` README/scripts from the Jul-19 audit) against vite :3100: all 4 tabs + calm_hub + skills_hub + journal tabs + episode + safety_plan. Fix any serious/critical (0 tolerance).
- [ ] **Step 2:** Emulator/device smoke: Home mood tap lands on energy step; every Tools row opens; crisis pill on all 4 tabs opens overlay; hardware back matrix (capture sheet, crisis-over-capture ordering) — foreground re-confirmed via `dumpsys window` before trusting any result.
- [ ] **Step 3:** Bump `package.json` version → `1.28.0`; bump `android/app/build.gradle` versionName `1.28.0` + versionCode (current +1 — read the gradle, don't trust memory).
- [ ] **Step 4:** Full suite + tsc + `npm run build` → green/clean. Commit `chore: release v1.28.0 — less-is-more redesign`, push branch.
- [ ] **Step 5:** STOP for user confirmation: merge to main + tag `v1.28.0` + GitHub release with signed APK (`nilamind-v1.28.0.apk`, cert 003f02bc…c37d) are outward-facing — per standing rule, publish only on explicit confirm.

---

## Self-review notes (done at write time)

- Spec §5.1–5.6 all map to tasks: Home (3–5), Nila (12–13), Tools (6–9), You (10–11), Crisis (2), sweep/i18n/tokens (14–16), ship (17). Mood-strip honesty = Task 3; ambient slot = Task 4; hub restorations = Tasks 7–8; youRows divergence = Task 10; Insights merge = Task 11; AUX_LABELS = Task 16.
- Names cross-checked: `setEmaPrefill/consumeEmaPrefill` (Tasks 3), `TOOL_META` (6→7), `calm_hub/skills_hub` ids consistent across 7–8 and toolMeta, `useAmbientSignals` return shape matches AmbientSlot test mock.
- Known unknowns called out in-task (ToolRow subtitle requirement, ConfirmDialog props, dbt_diary_card callers, PactNoticeCard liveness) each carry an explicit read/grep step + decision rule instead of an assumption.
