# Safety Layer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign NilaMind's §9 safety layer per `docs/superpowers/specs/2026-07-15-safety-layer-redesign-design.md` — a first-run safety-plan onboarding slide with a create-nudge, a decluttered/supportive crisis screen with new de-escalation content, and a crisis-line data fix.

**Architecture:** Ten small, independently-testable tasks touching existing files (`crisisResources.ts`, `safetyPlanFollowUp.ts`, `nav.ts`, `App.tsx`, `TodayScreen.tsx`, `OnboardingGate.tsx`, `safety.ts`, `CrisisOverlay.tsx`) plus two new components (`SafetyPlanNudgeCard.tsx`, `RideTheWaveCard.tsx`). No new services, no detection-logic changes — content, presentation, and one new onboarding slide.

**Tech Stack:** React + TypeScript, vitest + @testing-library/react, existing `secureLocal`/`storageUtils` persistence facades.

## Global Constraints

- Work happens ONLY in the isolated worktree at `/private/tmp/claude-501/-Users-sujithsampath/0b388cef-e8a0-4855-b6b4-85b2513cb3fa/scratchpad/nilamind-safety-redesign`, branch `feat/safety-layer-redesign`. Never touch `main` or any other branch/worktree — parallel work is in progress elsewhere.
- Do NOT merge to main and do NOT push anything without being asked again — the user said "I'll tell you" when it's time to merge.
- No changes to §9 detection logic: `scanForCrisis`, keyword lists, or classifier tiers in `src/safety.ts` are out of scope. Only `getCrisisReply()`'s copy changes.
- No LLM-generated crisis copy anywhere — all new/changed crisis-facing text is static, curated, reviewed here.
- India crisis lines: Tele-MANAS (14416) is primary; KIRAN must NOT appear (merged into Tele-MANAS, February 2024 — verified via BioSpectrum India / Drug Today reporting).
- Follow existing file conventions exactly: `id="..."` naming for interactive elements (e.g. `sp-*-input` for safety-plan fields), the dismiss-cooldown pattern already used in `src/services/ratingPrompt.ts`, and the Map-backed `secureLocal` test-mock pattern already used in `TodayScreen.test.tsx`.
- Every task ends with `npx tsc --noEmit` and the relevant vitest file(s) passing before committing. The final task runs the full suite.
- Commit after every task (small, frequent commits — this branch is reviewed by the user before any merge decision).

---

### Task 1: Fix stale KIRAN crisis-line listing

**Files:**
- Modify: `src/services/crisisResources.ts:43-58` (the `REGIONS.IN.lines` array)
- Test: `src/services/crisisResources.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `REGIONS.IN.lines` no longer contains a `KIRAN` entry. `getCrisisLines()` for region `IN` returns 4 lines (Tele-MANAS, iCall, Vandrevala Foundation, AASRA) instead of 5.

- [ ] **Step 1: Update the failing/changed tests first**

Edit `src/services/crisisResources.test.ts`. Replace the test that currently asserts KIRAN's presence:

```ts
  it("includes India-specific lines when region is IN", () => {
    setRegionCode("IN");
    expect(getRegionCode()).toBe("IN");
    const names = getCrisisLines().map((l) => l.name);
    expect(names).toContain("iCall");
    expect(names).toContain("Vandrevala Foundation");
    expect(names).toContain("AASRA");
  });
```

And replace the "still includes KIRAN" test entirely with:

```ts
  it("does not list KIRAN — merged into Tele-MANAS in February 2024, no longer a separate line", () => {
    setRegionCode("IN");
    const names = getCrisisLines().map((l) => l.name);
    expect(names.some((n) => /kiran/i.test(n))).toBe(false);
  });
```

Leave the other tests (`always returns at least one crisis line`, `lists Tele-MANAS first...`, `lists all supported regions`) unchanged.

- [ ] **Step 2: Run the tests to verify the new assertion fails**

Run: `npx vitest run src/services/crisisResources.test.ts`
Expected: FAIL on the new "does not list KIRAN" test (KIRAN is still in the source array).

- [ ] **Step 3: Remove the KIRAN entry from the source registry**

In `src/services/crisisResources.ts`, in `REGIONS.IN.lines`, delete the KIRAN line entry:

```ts
      { name: "KIRAN (Govt. of India)", display: "1800-599-0019", tel: "18005990019", kind: "call", note: "24/7, multi-language" },
```

and update the comment above the `IN` block to note the merge (append after the existing comment about Tele-MANAS):

```ts
      // Line status (all numbers below) should be spot-checked periodically — do not assume permanence.
      // 2026-07-15: KIRAN (1800-599-0019) removed — it was merged into Tele-MANAS in February 2024 and
      // no longer operates as a separate line (BioSpectrum India / Drug Today reporting).
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/services/crisisResources.test.ts`
Expected: PASS (all tests green, including the new KIRAN-absence test).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/services/crisisResources.ts src/services/crisisResources.test.ts
git commit -m "fix: remove KIRAN from India crisis lines — merged into Tele-MANAS Feb 2024"
```

---

### Task 2: Safety-plan create-nudge — pure functions

**Files:**
- Modify: `src/services/safetyPlanFollowUp.ts`
- Test: `src/services/safetyPlanFollowUp.test.ts`

**Interfaces:**
- Consumes: `SafetyPlan` type from `../types`; `ls()` from `./storageUtils` (not yet imported in this file).
- Produces: `hasMeaningfulSafetyPlanContent(plan: SafetyPlan): boolean`, `shouldNudgeToCreateSafetyPlan(plan: SafetyPlan): boolean`, `dismissCreateSafetyPlanNudge(): void` — consumed by Task 4's `SafetyPlanNudgeCard`.

- [ ] **Step 1: Write the failing tests**

Add to the top of `src/services/safetyPlanFollowUp.test.ts` (alongside the existing imports):

```ts
import {
  daysSinceLastReview,
  isStale,
  safetyPlanFollowUpContextBlock,
  shouldPromptReview,
  isFirstFollowUpDue,
  hasMeaningfulSafetyPlanContent,
  shouldNudgeToCreateSafetyPlan,
  dismissCreateSafetyPlanNudge,
} from "./safetyPlanFollowUp";
```

Append at the end of the file:

```ts
const blankPlan: SafetyPlan = {
  warningSigns: "",
  internalCoping: "",
  socialDistractors: "",
  trustedPeople: "",
  professionals: "",
  safeEnvironment: "",
};

describe("hasMeaningfulSafetyPlanContent (Gamarra et al. 2015 — quality, not completeness, predicts outcomes)", () => {
  it("false for a fully blank plan", () => {
    expect(hasMeaningfulSafetyPlanContent(blankPlan)).toBe(false);
  });

  it("false for whitespace-only fields", () => {
    expect(hasMeaningfulSafetyPlanContent({ ...blankPlan, warningSigns: "   " })).toBe(false);
  });

  it("false for a scrap shorter than the meaningful-content floor", () => {
    expect(hasMeaningfulSafetyPlanContent({ ...blankPlan, internalCoping: "walk" })).toBe(false);
  });

  it("true when at least one field has a real personalized sentence", () => {
    expect(hasMeaningfulSafetyPlanContent({ ...blankPlan, warningSigns: "not sleeping, going quiet" })).toBe(true);
  });
});

describe("shouldNudgeToCreateSafetyPlan (the create-nudge that doesn't exist today — only review-nudges do)", () => {
  it("true for a blank plan with no prior dismissal", () => {
    expect(shouldNudgeToCreateSafetyPlan(blankPlan)).toBe(true);
  });

  it("false once the plan has meaningful content", () => {
    expect(shouldNudgeToCreateSafetyPlan({ ...blankPlan, warningSigns: "not sleeping, going quiet" })).toBe(false);
  });

  it("dismissCreateSafetyPlanNudge never throws even with no storage backing (node env)", () => {
    expect(() => dismissCreateSafetyPlanNudge()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/safetyPlanFollowUp.test.ts`
Expected: FAIL with "hasMeaningfulSafetyPlanContent is not a function" (or similar — the exports don't exist yet).

- [ ] **Step 3: Implement the pure functions**

In `src/services/safetyPlanFollowUp.ts`, add the import at the top (alongside the existing `import type { SafetyPlan } from "../types";`):

```ts
import { ls } from "./storageUtils";
```

Append this block after the existing `markSafetyPlanReviewed` function (end of file):

```ts
/** Minimum trimmed length for a field to count as genuinely personalized rather than blank/a scrap.
 *  Matches the evidence that plan QUALITY, not completeness, predicts outcomes (Gamarra et al. 2015,
 *  Crisis 36(6):433-443) — one real sentence counts; six empty fields don't. */
const MEANINGFUL_CONTENT_MIN_LENGTH = 10;

const SAFETY_PLAN_FIELDS: (keyof SafetyPlan)[] = [
  "warningSigns",
  "internalCoping",
  "socialDistractors",
  "trustedPeople",
  "professionals",
  "safeEnvironment",
];

/** True when at least one field has genuinely personalized content (not just blank/whitespace/a scrap). */
export function hasMeaningfulSafetyPlanContent(plan: SafetyPlan): boolean {
  return SAFETY_PLAN_FIELDS.some((f) => {
    const v = plan[f];
    return typeof v === "string" && v.trim().length >= MEANINGFUL_CONTENT_MIN_LENGTH;
  });
}

const CREATE_NUDGE_DISMISSED_KEY = "nilamind_safetyplan_create_nudge_dismissed_at";
const CREATE_NUDGE_COOLDOWN_DAYS = 7;

/** Gate for the Today-tab "set up your coping plan" nudge — the create-nudge that (unlike the 48h/14-day
 *  review nudges above) fires for users who never started a plan. Most at-risk help-seekers don't know
 *  the safety-plan concept exists (Rainbow et al. 2024, J Affect Disord). Never fires once the plan has
 *  real content; otherwise respects a dismiss cooldown so it never nags — same shape as ratingPrompt.ts. */
export function shouldNudgeToCreateSafetyPlan(plan: SafetyPlan): boolean {
  if (hasMeaningfulSafetyPlanContent(plan)) return false;
  try {
    const raw = ls()?.getItem(CREATE_NUDGE_DISMISSED_KEY);
    if (raw) {
      const daysSince = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
      if (daysSince < CREATE_NUDGE_COOLDOWN_DAYS) return false;
    }
  } catch {
    /* best effort — default to showing the nudge */
  }
  return true;
}

/** Records that the user dismissed the create-nudge, starting the cooldown. */
export function dismissCreateSafetyPlanNudge(): void {
  try {
    ls()?.setItem(CREATE_NUDGE_DISMISSED_KEY, String(Date.now()));
  } catch {
    /* best effort */
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/safetyPlanFollowUp.test.ts`
Expected: PASS (all tests, old and new).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/services/safetyPlanFollowUp.ts src/services/safetyPlanFollowUp.test.ts
git commit -m "feat: add safety-plan create-nudge pure functions (Gamarra 2015 quality gate)"
```

---

### Task 3: Wire `safety_plan` as a top-level aux view

**Files:**
- Modify: `src/services/nav.ts`
- Modify: `src/App.tsx`
- Test: `src/services/nav.test.ts`

**Interfaces:**
- Consumes: `SafetyPlanScreen` default export from `./components/SafetyPlanScreen` (already exists).
- Produces: `resolveNavTarget("safety_plan")` → `{ kind: "aux", view: "safety_plan" }`; `go("safety_plan")` in App.tsx opens `SafetyPlanScreen` in the existing aux-view sheet. Consumed by Task 4's `SafetyPlanNudgeCard` and Task 8's `CrisisOverlay` "build it later" button.

- [ ] **Step 1: Write the failing test**

Append to `src/services/nav.test.ts`:

```ts
describe("nav — safety_plan aux view", () => {
  it("resolves safety_plan to an aux view", () => {
    expect(resolveNavTarget("safety_plan")).toEqual({ kind: "aux", view: "safety_plan" });
  });
  it("lists safety_plan in the allowlist", () => {
    expect(KNOWN_AUX_VIEWS).toContain("safety_plan");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/nav.test.ts`
Expected: FAIL — `resolveNavTarget("safety_plan")` currently returns `{ kind: "unknown", target: "safety_plan" }`.

- [ ] **Step 3: Add `safety_plan` to the nav allowlists**

In `src/services/nav.ts`, add `"safety_plan"` to the `AuxView` union type (anywhere in the list, e.g. after `"sounds"`):

```ts
  | "sounds"
  | "safety_plan";
```

And add it to `KNOWN_AUX_VIEWS`:

```ts
export const KNOWN_AUX_VIEWS: readonly AuxView[] = [
   "about_nila", "insights", "thought_record", "settings", "behaviour", "reach_out", "assessment",
   "skills", "dashboard", "your_data", "nila_memory", "winddown", "understand",
   "learn", "medication", "problem_solving", "values_work", "exposure", "relapse_plan", "caregiver", "episode",
   "diary",
     "social_rhythm",
      "ema_checkin",
      "wellbeing",
      "episode_marker",
  "caregiver_settings",
  "legal",
  "sounds",
  "safety_plan",
    ];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/nav.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the aux view in App.tsx**

In `src/App.tsx`, add the import (alongside other component imports near line 78's `OnboardingGate` import):

```ts
import SafetyPlanScreen from "./components/SafetyPlanScreen";
```

Add a label to `AUX_LABELS`:

```ts
  sounds: "Ambient sounds",
  safety_plan: "My Safety Plan",
```

Add a case to `renderAuxView`'s switch, right before the `default:` line:

```ts
    case "safety_plan": return <SafetyPlanScreen />;
```

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/services/nav.ts src/services/nav.test.ts src/App.tsx
git commit -m "feat: wire safety_plan as a top-level aux view (reachable from Today tab)"
```

---

### Task 4: Today-tab "set up your coping plan" nudge card

**Files:**
- Create: `src/components/SafetyPlanNudgeCard.tsx`
- Create: `src/components/SafetyPlanNudgeCard.test.tsx`
- Modify: `src/components/TodayScreen.tsx`

**Interfaces:**
- Consumes: `shouldNudgeToCreateSafetyPlan`, `dismissCreateSafetyPlanNudge` from `../services/safetyPlanFollowUp` (Task 2); `parseSafetyPlan` from `../services/safetyPlan`; `secureLocal` from `../services/secureLocal`; `go: (target: string) => void` prop (already exists on `TodayScreen`).
- Produces: `<SafetyPlanNudgeCard go={go} />` — a self-contained, no-prop-besides-`go` component.

- [ ] **Step 1: Write the failing test**

Create `src/components/SafetyPlanNudgeCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import SafetyPlanNudgeCard from "./SafetyPlanNudgeCard";

afterEach(() => {
  cleanup();
  store.clear();
  localStorage.clear();
});

describe("SafetyPlanNudgeCard — the create-nudge that doesn't exist today", () => {
  it("renders when the plan has no meaningful content", () => {
    render(<SafetyPlanNudgeCard go={() => {}} />);
    expect(screen.getByText(/haven't set up a coping plan/i)).toBeTruthy();
  });

  it("does not render once the plan has real content", () => {
    store.set(
      "nilamind_safetyplan",
      JSON.stringify({
        warningSigns: "not sleeping, going quiet",
        internalCoping: "",
        socialDistractors: "",
        trustedPeople: "",
        professionals: "",
        safeEnvironment: "",
      }),
    );
    render(<SafetyPlanNudgeCard go={() => {}} />);
    expect(screen.queryByText(/haven't set up a coping plan/i)).toBeNull();
  });

  it("tapping 'Set it up' navigates to the safety plan and hides the card", () => {
    const go = vi.fn();
    render(<SafetyPlanNudgeCard go={go} />);
    fireEvent.click(document.getElementById("safety-plan-nudge-open-btn")!);
    expect(go).toHaveBeenCalledWith("safety_plan");
    expect(screen.queryByText(/haven't set up a coping plan/i)).toBeNull();
  });

  it("dismissing hides the card", () => {
    render(<SafetyPlanNudgeCard go={() => {}} />);
    fireEvent.click(screen.getByLabelText(/dismiss/i));
    expect(screen.queryByText(/haven't set up a coping plan/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SafetyPlanNudgeCard.test.tsx`
Expected: FAIL — the module `./SafetyPlanNudgeCard` doesn't exist yet.

- [ ] **Step 3: Implement the component**

Create `src/components/SafetyPlanNudgeCard.tsx`:

```tsx
import { useState } from "react";
import { LifeBuoy, X } from "lucide-react";
import { secureLocal } from "../services/secureLocal";
import { parseSafetyPlan } from "../services/safetyPlan";
import { shouldNudgeToCreateSafetyPlan, dismissCreateSafetyPlanNudge } from "../services/safetyPlanFollowUp";

interface SafetyPlanNudgeCardProps {
  go: (target: string) => void;
}

// The create-nudge that didn't exist before this redesign — safetyPlanFollowUp.ts already nudges to
// REVIEW an existing plan (48h/14-day), but nothing ever invited a user to make one in the first place.
// Same dismissible-card shape as RatingPromptCard, so it's visually familiar rather than a new pattern.
export default function SafetyPlanNudgeCard({ go }: SafetyPlanNudgeCardProps) {
  const [show, setShow] = useState(() =>
    shouldNudgeToCreateSafetyPlan(parseSafetyPlan(secureLocal.getItem("nilamind_safetyplan"))),
  );

  if (!show) return null;

  const handleDismiss = () => {
    dismissCreateSafetyPlanNudge();
    setShow(false);
  };

  const handleOpen = () => {
    setShow(false);
    go("safety_plan");
  };

  return (
    <div
      className="glass rounded-2xl p-4 space-y-3 relative animate-fade-in border border-rose-500/20"
      id="safety-plan-nudge-card"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-2.5 pr-8">
        <LifeBuoy className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm text-slate-200 leading-relaxed">
            You haven't set up a coping plan yet. A couple of quick notes now can help a lot on a harder day.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleOpen}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
              id="safety-plan-nudge-open-btn"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              Set it up
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer min-h-[44px]"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/SafetyPlanNudgeCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount the card in TodayScreen**

In `src/components/TodayScreen.tsx`, add the import near the other card imports:

```ts
import SafetyPlanNudgeCard from "./SafetyPlanNudgeCard";
```

Mount it right after `<RatingPromptCard />` (found via `grep -n "RatingPromptCard" src/components/TodayScreen.tsx`):

```tsx
      {/* Gentle Play Store rating prompt — only after 5+ positive sessions */}
      <RatingPromptCard />

      {/* Nudge to set up a coping plan — the create-nudge that didn't exist before this redesign */}
      <SafetyPlanNudgeCard go={go} />
```

- [ ] **Step 6: Run the full TodayScreen test file to make sure nothing broke**

Run: `npx vitest run src/components/TodayScreen.test.tsx`
Expected: PASS (existing tests unaffected — they don't assert on the full rendered card list, per the file's current test bodies).

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/components/SafetyPlanNudgeCard.tsx src/components/SafetyPlanNudgeCard.test.tsx src/components/TodayScreen.tsx
git commit -m "feat: add Today-tab nudge to create a coping plan (the missing create-nudge)"
```

---

### Task 5: First-run onboarding — "Let's set up your safety net" slide

**Files:**
- Modify: `src/components/OnboardingGate.tsx`
- Modify: `src/components/OnboardingGate.test.tsx`

**Interfaces:**
- Consumes: `SafetyPlan` type from `../types`; `parseSafetyPlan` from `../services/safetyPlan` (not yet imported in this file); `secureLocal` (already imported).
- Produces: one new slide (`id: "safety_net"`) inserted into the onboarding sequence between `personalize` and `region`; on `finish()`, writes any filled field into the real `nilamind_safetyplan` record with `lastUpdatedAt` stamped.

- [ ] **Step 1: Update the existing test's slide-index dependency (it will otherwise pass for the wrong reason)**

In `src/components/OnboardingGate.test.tsx`, the `goToHowNilaHelpsSlide` helper currently does 6 "Next" clicks to reach `how_nila_helps` (previously slide index 6). Inserting the new slide shifts `how_nila_helps` to index 7. Update the helper:

```tsx
function goToHowNilaHelpsSlide() {
  render(<OnboardingGate onComplete={noop} onOpenCrisis={noop} />);
  // nila_intro -> privacy -> mood_check -> personalize -> safety_net -> region -> nudge_cadence -> how_nila_helps (7 "Next" taps)
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
}
```

Also upgrade the top-of-file `secureLocal` mock from a no-op stub to a Map-backed store (needed so the new tests in Step 2 can inspect what got written):

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import OnboardingGate from "./OnboardingGate";

afterEach(() => { cleanup(); store.clear(); });
const noop = () => {};
```

- [ ] **Step 2: Run the existing test file to confirm the index-shift fix alone doesn't break anything yet**

Run: `npx vitest run src/components/OnboardingGate.test.tsx`
Expected: PASS (the 7-click helper still reaches a slide correctly since the new slide doesn't exist yet — the 7th click currently just lands past `how_nila_helps` if the old file had only 8 slides total. To keep this step meaningful, run it AFTER Step 1's edits but BEFORE adding the new slide in Step 4 — expect this to actually FAIL at this point, since with only 8 existing slides, 7 "Next" clicks overshoots `how_nila_helps` (now at old index 6, needs only 6 clicks) and lands one slide too far (`ready`). That failure is expected and confirms the test is exercising real slide positions — it will pass once Step 4 inserts the new slide.

- [ ] **Step 3: Write the new failing tests for the safety-net slide**

Append to `src/components/OnboardingGate.test.tsx`:

```tsx
describe("OnboardingGate — safety net slide (first-run coping plan, never blocking)", () => {
  it("shows three optional prompts after personalize, before region", () => {
    render(<OnboardingGate onComplete={noop} onOpenCrisis={noop} />);
    // nila_intro -> privacy -> mood_check -> personalize -> safety_net (4 "Next" taps)
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    expect(screen.getByText(/safety net/i)).toBeTruthy();
    expect(document.getElementById("sp-onboarding-warningsign-input")).toBeTruthy();
    expect(document.getElementById("sp-onboarding-copingidea-input")).toBeTruthy();
    expect(document.getElementById("sp-onboarding-trustedperson-input")).toBeTruthy();
  });

  it("completing onboarding with all three fields blank never writes a safety plan record", () => {
    const onComplete = vi.fn();
    render(<OnboardingGate onComplete={onComplete} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByText(/next/i)); // -> privacy
    fireEvent.click(screen.getByText(/next/i)); // -> mood_check
    fireEvent.click(screen.getByText(/next/i)); // -> personalize
    fireEvent.click(screen.getByText(/next/i)); // -> safety_net
    fireEvent.click(screen.getByText(/next/i)); // -> region
    fireEvent.click(screen.getByText(/next/i)); // -> nudge_cadence
    fireEvent.click(screen.getByText(/next/i)); // -> how_nila_helps
    fireEvent.click(screen.getByText(/next/i)); // -> ready
    fireEvent.click(screen.getByText(/start/i)); // finish()
    expect(store.get("nilamind_safetyplan")).toBeUndefined();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("filling the warning-sign field persists it into the real safety plan on completion", () => {
    render(<OnboardingGate onComplete={noop} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByText(/next/i)); // -> privacy
    fireEvent.click(screen.getByText(/next/i)); // -> mood_check
    fireEvent.click(screen.getByText(/next/i)); // -> personalize
    fireEvent.click(screen.getByText(/next/i)); // -> safety_net
    fireEvent.change(document.getElementById("sp-onboarding-warningsign-input")!, {
      target: { value: "not sleeping" },
    });
    fireEvent.click(screen.getByText(/next/i)); // -> region
    fireEvent.click(screen.getByText(/next/i)); // -> nudge_cadence
    fireEvent.click(screen.getByText(/next/i)); // -> how_nila_helps
    fireEvent.click(screen.getByText(/next/i)); // -> ready
    fireEvent.click(screen.getByText(/start/i)); // finish()
    const raw = store.get("nilamind_safetyplan");
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!);
    expect(saved.warningSigns).toBe("not sleeping");
    expect(typeof saved.lastUpdatedAt).toBe("number");
  });
});
```

- [ ] **Step 4: Run tests to verify the new ones fail**

Run: `npx vitest run src/components/OnboardingGate.test.tsx`
Expected: FAIL — no `safety_net` slide exists yet, so `screen.getByText(/safety net/i)` throws.

- [ ] **Step 5: Implement the new slide**

In `src/components/OnboardingGate.tsx`, add imports near the top (after the existing `import { setEmaEnabled, setEmaFrequency } from "../services/emaPrefs";`):

```ts
import type { SafetyPlan } from "../types";
import { parseSafetyPlan } from "../services/safetyPlan";
```

Add new component state, alongside the other `useState` declarations in the component body:

```ts
  const [safetyNet, setSafetyNet] = useState({ warningSign: "", copingIdea: "", trustedPerson: "" });
```

Insert a new slide object into `getSlides()`'s returned array, between the `personalize` and `region` entries:

```ts
    {
      id: "safety_net",
      title: "Let's set up your safety net",
      body: "A few optional notes now can help a lot on a harder day. Nothing here is required — you can always add to it later.",
      icon: <LifeBuoy className="w-10 h-10 text-rose-400" />,
    },
```

Add the slide's form rendering, alongside the other `{slide.id === "..." && (...)}` blocks (e.g. right after the `personalize` block):

```tsx
        {slide.id === "safety_net" && (
          <div className="w-full space-y-3 text-left">
            <div>
              <label htmlFor="sp-onboarding-warningsign-input" className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                A warning sign for you (optional)
              </label>
              <input
                id="sp-onboarding-warningsign-input"
                type="text"
                value={safetyNet.warningSign}
                onChange={(e) => setSafetyNet((p) => ({ ...p, warningSign: e.target.value }))}
                placeholder="e.g. not sleeping, going quiet"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>
            <div>
              <label htmlFor="sp-onboarding-copingidea-input" className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                One thing you can do alone to cope (optional)
              </label>
              <input
                id="sp-onboarding-copingidea-input"
                type="text"
                value={safetyNet.copingIdea}
                onChange={(e) => setSafetyNet((p) => ({ ...p, copingIdea: e.target.value }))}
                placeholder="e.g. cold water on my face, a walk"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>
            <div>
              <label htmlFor="sp-onboarding-trustedperson-input" className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Someone you could reach out to (optional, name only)
              </label>
              <input
                id="sp-onboarding-trustedperson-input"
                type="text"
                value={safetyNet.trustedPerson}
                onChange={(e) => setSafetyNet((p) => ({ ...p, trustedPerson: e.target.value }))}
                placeholder="e.g. Maya"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              You can skip this and fill it in anytime — even one line helps future-you.
            </p>
          </div>
        )}
```

Update `finish()` to persist any filled field, right after the existing `if (baselineMood != null) { ... }` block and before the notification-cadence logic:

```ts
    const { warningSign, copingIdea, trustedPerson } = safetyNet;
    if (warningSign.trim() || copingIdea.trim() || trustedPerson.trim()) {
      try {
        const existing = parseSafetyPlan(secureLocal.getItem("nilamind_safetyplan"));
        const updated: SafetyPlan = {
          ...existing,
          warningSigns: warningSign.trim() || existing.warningSigns,
          internalCoping: copingIdea.trim() || existing.internalCoping,
          trustedPeople: trustedPerson.trim() || existing.trustedPeople,
          lastUpdatedAt: Date.now(),
        };
        secureLocal.setItem("nilamind_safetyplan", JSON.stringify(updated));
      } catch {
        /* best effort — never block onboarding completion on this */
      }
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/OnboardingGate.test.tsx`
Expected: PASS (all tests, old and new).

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/components/OnboardingGate.tsx src/components/OnboardingGate.test.tsx
git commit -m "feat: first-run safety-net slide — 3 optional prompts, never blocking, autosaves the real plan"
```

---

### Task 6: Validation-first crisis reply copy

**Files:**
- Modify: `src/safety.ts:886-898` (`getCrisisReply`)
- Test: `src/safety.test.ts`

**Interfaces:**
- Consumes: `getCrisisLines()` (already imported/used in this function — unchanged).
- Produces: `getCrisisReply(): string` — same signature and same invariant (always includes real crisis-line text), validation-first opening line.

- [ ] **Step 1: Write the failing test**

In `src/safety.test.ts`, add `getCrisisReply` to the existing top-of-file import:

```ts
import { isStreamingHarm, scanForCrisis, checkResponse, isBenignMedicationAdherence, isBenignHyperbole, isBenignExhaustion, isBenignOkayReassurance, isBenignExistentialReferent, METHOD_INTENT_PHRASES, SYCOPHANTIC_AFFIRMATIONS, ROMANIZED_IDEATION, SLANG_IDEATION, getCrisisReply } from "./safety";
```

Append at the end of the file:

```ts
describe("getCrisisReply — validation-first copy (crisis-moment UX redesign)", () => {
  it("opens with acknowledgment/validation before any instruction", () => {
    const reply = getCrisisReply();
    const firstSentence = reply.split(/\n/)[0].toLowerCase();
    expect(firstSentence).toMatch(/real|glad|heavy|matters/);
  });

  it("still includes at least one real crisis-line reference (unconditional invariant, unchanged)", () => {
    const reply = getCrisisReply();
    expect(reply).toMatch(/\d/); // a phone number/digit sequence is present
  });

  it("never uses 'commit suicide' phrasing (safe-messaging constraint)", () => {
    expect(getCrisisReply().toLowerCase()).not.toMatch(/commit(ted|ting)?\s+suicide/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/safety.test.ts -t "getCrisisReply"`
Expected: FAIL on the "opens with acknowledgment" test — the current first line is "This moment is heavy. Let's find one thing to steady through it." which DOES match `/heavy/`, so this particular assertion might already pass. Run it anyway to confirm baseline, then proceed to Step 3 to make the copy more clearly validation-first per the design brief regardless.

- [ ] **Step 3: Update the copy**

In `src/safety.ts`, replace the `getCrisisReply` function body:

```ts
/** The deterministic crisis reply — validation-first, then solution-forward: immediate coping actions, then helplines. */
export function getCrisisReply(): string {
  return `What you're feeling right now is real, and I'm glad you're still here. This moment is heavy — let's find one thing to steady through it together.

→ Try 5-4-3-2-1 grounding: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 thing you can taste.

→ Box breathing: inhale 4 seconds, hold 4, exhale 4, hold 4.

Or reach for a human right now — trained listeners who know what this feels like:

${getCrisisLines().map((l) => `📞 ${l.name}: ${l.display}`).join("\n")}

These are free, confidential, available right now. I'm still here too — your safety plan and more ways to steady are just below.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/safety.test.ts -t "getCrisisReply"`
Expected: PASS.

- [ ] **Step 5: Run the full safety-related test files that consume this function, to confirm nothing broke**

Run: `npx vitest run src/safety.test.ts src/services/nilaSafetyGate.test.ts src/services/nilaSafetyInvariants.test.ts src/services/sendToNila.test.ts src/services/coachAssist.test.ts src/services/localNila.test.ts src/services/nilaSend.test.ts`
Expected: PASS — these tests compare against the live `getCrisisReply()`/`getUnsafeFallbackReply()` output by reference, not a fixed string literal, so they remain green.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/safety.ts src/safety.test.ts
git commit -m "feat: validation-first opening line in the deterministic crisis reply"
```

---

### Task 7: "Ride out the next few minutes" de-escalation content component

**Files:**
- Create: `src/components/RideTheWaveCard.tsx`
- Create: `src/components/RideTheWaveCard.test.tsx`

**Interfaces:**
- Consumes: nothing (self-contained, no props, no services).
- Produces: `export default function RideTheWaveCard(): JSX.Element` — consumed by Task 8's `CrisisOverlay`.

- [ ] **Step 1: Write the failing test**

Create `src/components/RideTheWaveCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import RideTheWaveCard from "./RideTheWaveCard";

afterEach(cleanup);

describe("RideTheWaveCard — de-escalation content (the 'left with nothing' gap)", () => {
  it("renders the heading and the wave/temporal framing", () => {
    render(<RideTheWaveCard />);
    expect(screen.getByText(/ride out the next few minutes/i)).toBeTruthy();
    expect(screen.getByText(/rise, peak, and pass/i)).toBeTruthy();
  });

  it("renders the cold-water technique with the medical caveat", () => {
    render(<RideTheWaveCard />);
    expect(screen.getByText(/cold water/i)).toBeTruthy();
    expect(screen.getByText(/beta blockers/i)).toBeTruthy();
  });

  it("lets the user rate urge intensity 0-10 and shows a running history", () => {
    render(<RideTheWaveCard />);
    fireEvent.click(screen.getByLabelText("Rate intensity 8 out of 10"));
    expect(document.getElementById("urge-rating-history")?.textContent).toMatch(/8/);
    fireEvent.click(screen.getByLabelText("Rate intensity 5 out of 10"));
    expect(document.getElementById("urge-rating-history")?.textContent).toMatch(/8 → 5/);
  });

  it("includes a method-free coping vignette and a generic means-safety line", () => {
    render(<RideTheWaveCard />);
    expect(screen.getByText(/something people say afterward/i)).toBeTruthy();
    expect(screen.getByText(/distance between you and it/i)).toBeTruthy();
  });

  it("never names a specific method (safe-messaging constraint)", () => {
    render(<RideTheWaveCard />);
    const text = document.getElementById("ride-the-wave-card")?.textContent ?? "";
    expect(text.toLowerCase()).not.toMatch(/overdose|pills|rope|jump|gun|blade|razor/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/RideTheWaveCard.test.tsx`
Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Implement the component**

Create `src/components/RideTheWaveCard.tsx`:

```tsx
import { useState } from "react";
import { Waves, Snowflake } from "lucide-react";

// "Ride out the next few minutes" — the de-escalation content the crisis screen was missing (user
// complaint: the app just pushes the safety gate and the person is left with nothing). Structure and
// copy grounded in: Simon et al. 2001 and Deisenhammer et al. 2009 (the acute decision-to-act window is
// usually minutes, not hours — the temporal fact is itself therapeutic content); Jungmann et al. 2018,
// JMIR Form Res (cold facial/neck stimulation raises HRV via the dive reflex); Now Matters Now
// (Whiteside et al. 2019, JMIR 21(5):e13183 — a self-administered skills page is associated with
// in-the-moment reduction in suicidal-thought intensity, incl. in the highest-severity subgroup);
// Papageno effect (Niederkrotenthaler et al. 2010) — coping-focused, method-free narratives, framed
// honestly as a common/composite experience rather than a fabricated named testimonial. All copy here
// is curated and static — never model-generated (matches the app's existing crisis-copy invariant).
const URGE_SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function RideTheWaveCard() {
  const [ratings, setRatings] = useState<number[]>([]);

  const rate = (value: number) => setRatings((prev) => [...prev, value]);

  return (
    <div className="space-y-4" id="ride-the-wave-card">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Ride out the next few minutes
      </h2>

      <div className="bg-card border border-slate-800 p-4 rounded-xl space-y-3 text-sm text-slate-300 leading-relaxed">
        <p>
          What you're feeling right now is real, and it's a lot. You're still here reading this — that matters.
        </p>
        <p>
          Intense urges like this tend to rise, peak, and pass — even when it doesn't feel that way from
          inside it. The next few minutes matter more than the rest of tonight does. Your only job right
          now is to get through them.
        </p>
        <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <Snowflake className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
          <p className="text-slate-200">
            One thing that can help fast: fill a bowl or sink with cold water, take a breath, and put your
            face in for 15 to 30 seconds. It sounds strange — your body has a built-in calming reflex this
            triggers. Heart condition or on beta blockers? Use a cold pack on your cheeks instead.
          </p>
        </div>
      </div>

      <div className="bg-card border border-slate-800 p-4 rounded-xl space-y-3">
        <p className="text-sm text-slate-200 font-medium">How strong does it feel right now, 0 to 10?</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rate your current urge intensity, 0 to 10">
          {URGE_SCALE.map((n) => (
            <button
              key={n}
              onClick={() => rate(n)}
              aria-label={`Rate intensity ${n} out of 10`}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              {n}
            </button>
          ))}
        </div>
        {ratings.length > 0 && (
          <p className="text-xs text-slate-500" id="urge-rating-history">
            Your check-ins: {ratings.join(" → ")}
            {ratings.length > 1
              ? " — come back and rate it again whenever you want."
              : " — noted. Try checking again in a little while; it often shifts."}
          </p>
        )}
      </div>

      <div className="bg-card border border-slate-800 p-4 rounded-xl text-sm text-slate-300 leading-relaxed space-y-2">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
          <Waves className="w-3.5 h-3.5" /> Something people say afterward
        </div>
        <p className="italic">
          "I didn't want to die — I just wanted the pain to stop for a while. I put my face in cold water
          and counted my breaths until the worst of it passed. It did pass."
        </p>
      </div>

      <div className="bg-card border border-slate-800 p-4 rounded-xl text-sm text-slate-300 leading-relaxed">
        <p>
          If anything nearby could hurt you, putting some distance between you and it — a locked drawer,
          another room, asking someone to hold onto it for a while — is one of the strongest things you can
          do right now.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/RideTheWaveCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/components/RideTheWaveCard.tsx src/components/RideTheWaveCard.test.tsx
git commit -m "feat: add Ride the Wave de-escalation content component"
```

---

### Task 8: Declutter CrisisOverlay + mount the new content + "build it later"

**Files:**
- Modify: `src/components/CrisisOverlay.tsx`
- Modify: `src/components/CrisisOverlay.test.tsx`
- Modify: `src/App.tsx` (wire the new `onBuildPlanLater` prop)

**Interfaces:**
- Consumes: `RideTheWaveCard` (Task 7); existing `SafetyPlan`, `parseSafetyPlan`, `CrisisLines`.
- Produces: `CrisisOverlayProps` gains an optional `onBuildPlanLater?: () => void`. Blank plan sections no longer render; an empty plan shows one invitational block instead.

- [ ] **Step 1: Update the existing test's fixture and assertions to match the new declutter behavior**

In `src/components/CrisisOverlay.test.tsx`, replace the static `secureLocal` mock with a Map-backed one (matching the pattern used elsewhere in this plan):

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// audit #27: the app had NO component render tests — the vitest env was node-only and only *.test.ts. So the
// §9 crisis surface (the most safety-relevant UI) was never mounted/asserted. This is the first render test:
// it mounts the real CrisisOverlay and checks the crisis affordances render and the close/handoff wiring fires.
const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

const offerPostCrisisCheckInMock = vi.fn();
const declinePostCrisisCheckInMock = vi.fn();
vi.mock("../services/postCrisisCheckIn", () => ({
  offerPostCrisisCheckIn: (...args: unknown[]) => offerPostCrisisCheckInMock(...args),
  declinePostCrisisCheckIn: (...args: unknown[]) => declinePostCrisisCheckInMock(...args),
}));

import CrisisOverlay from "./CrisisOverlay";

afterEach(() => { cleanup(); store.clear(); });
const noop = () => {};
```

Replace the `"mounts the crisis dialog with helplines, grounding/breathing shortcuts and the safety plan"` test with one that seeds a filled plan (since the declutter behavior now hides blank sections):

```tsx
  it("mounts the crisis dialog with helplines, grounding/breathing shortcuts, and filled safety-plan sections", () => {
    store.set(
      "nilamind_safetyplan",
      JSON.stringify({
        warningSigns: "not sleeping, going quiet",
        internalCoping: "cold water on my face",
        socialDistractors: "",
        trustedPeople: "",
        professionals: "",
        safeEnvironment: "",
      }),
    );
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/you reached for this/i)).toBeTruthy();
    // ≥1 crisis line always renders (registry guarantees a non-empty International fallback)
    expect((document.getElementById("crisis-lines")?.children.length ?? 0)).toBeGreaterThan(0);
    expect(document.getElementById("grounding-shortcut-btn")).toBeTruthy();
    expect(document.getElementById("breathing-shortcut-btn")).toBeTruthy();
    expect(screen.getAllByText(/coping plan/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/warning signs i notice/i)).toBeTruthy(); // filled section 1 renders
  });

  it("declutters: a fully blank plan shows an invitation instead of six empty placeholder sections", () => {
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(screen.queryByText(/warning signs i notice/i)).toBeNull();
    expect(screen.queryByText(/things i can do on my own to cope/i)).toBeNull();
    expect(screen.getByText(/haven't built a coping plan yet/i)).toBeTruthy();
  });

  it("declutters: only filled sections render when the plan is partially filled", () => {
    store.set(
      "nilamind_safetyplan",
      JSON.stringify({
        warningSigns: "not sleeping",
        internalCoping: "",
        socialDistractors: "",
        trustedPeople: "",
        professionals: "",
        safeEnvironment: "",
      }),
    );
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(screen.getByText(/warning signs i notice/i)).toBeTruthy();
    expect(screen.queryByText(/things i can do on my own to cope/i)).toBeNull();
  });

  it("renders the Ride the Wave de-escalation content", () => {
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(document.getElementById("ride-the-wave-card")).toBeTruthy();
  });

  it("calls onBuildPlanLater from the blank-plan invitation when provided", () => {
    const onBuildPlanLater = vi.fn();
    render(
      <CrisisOverlay
        isOpen
        onClose={noop}
        onNavigateToGrounding={noop}
        onNavigateToBreathing={noop}
        onBuildPlanLater={onBuildPlanLater}
      />,
    );
    fireEvent.click(document.getElementById("crisis-build-plan-later-btn")!);
    expect(onBuildPlanLater).toHaveBeenCalledOnce();
  });
```

Leave the remaining existing tests (`renders nothing when closed`, `calls onClose when...`, `grounding shortcut...`, the whole `opt-in post-crisis check-in` describe block) unchanged — they don't depend on plan content.

- [ ] **Step 2: Run tests to verify the new/changed ones fail**

Run: `npx vitest run src/components/CrisisOverlay.test.tsx`
Expected: FAIL — declutter logic, `RideTheWaveCard` mount, and `onBuildPlanLater` don't exist yet.

- [ ] **Step 3: Implement the declutter logic, new content mount, and new prop**

In `src/components/CrisisOverlay.tsx`, add the import:

```ts
import RideTheWaveCard from "./RideTheWaveCard";
```

Update the props interface:

```ts
interface CrisisOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToGrounding: () => void;
  onNavigateToBreathing: () => void;
  onBuildPlanLater?: () => void;
}
```

Update the function signature to destructure the new prop:

```ts
export default function CrisisOverlay({
  isOpen,
  onClose,
  onNavigateToGrounding,
  onNavigateToBreathing,
  onBuildPlanLater,
}: CrisisOverlayProps) {
```

Add a `hasContent` helper and computed `anyContent` flag right after the existing `useEffect` block, before the `if (!isOpen) return null;` line:

```ts
  const hasContent = (v: string) => v.trim().length > 0;
  const anyContent =
    hasContent(safetyPlan.warningSigns) ||
    hasContent(safetyPlan.internalCoping) ||
    hasContent(safetyPlan.socialDistractors) ||
    hasContent(safetyPlan.trustedPeople) ||
    hasContent(safetyPlan.professionals) ||
    hasContent(safetyPlan.safeEnvironment);
```

Insert `<RideTheWaveCard />` right after the "Try these first" quick-actions `<div>` block closes and before the "Crisis lines" block opens (i.e., between the `</div>` that closes the grounding/breathing buttons section and the `{/* Crisis lines — secondary, always available */}` comment):

```tsx
        {/* Ride out the next few minutes — the de-escalation content that was missing */}
        <RideTheWaveCard />

```

Replace the entire "Your coping plan" section (from `{/* Your coping plan */}` through its closing `</div>` before the "Gentle non-abrupt Exit Footer" comment) with:

```tsx
        {/* Your coping plan — decluttered: only sections with real content render */}
        {anyContent ? (
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your coping plan
            </h2>

            {hasContent(safetyPlan.warningSigns) && (
              <div className="bg-card border border-slate-800 p-4 rounded-xl">
                <h3 className="text-slate-100 font-semibold text-sm mb-1">
                  1. Warning signs I notice:
                </h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{safetyPlan.warningSigns}</p>
              </div>
            )}

            {hasContent(safetyPlan.internalCoping) && (
              <div className="bg-card border border-slate-800 p-4 rounded-xl">
                <h3 className="text-slate-100 font-semibold text-sm mb-1">
                  2. Things I can do on my own to cope:
                </h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{safetyPlan.internalCoping}</p>
              </div>
            )}

            {hasContent(safetyPlan.socialDistractors) && (
              <div className="bg-card border border-slate-800 p-4 rounded-xl">
                <h3 className="text-slate-100 font-semibold text-sm mb-1">
                  3. People and places that distract me:
                </h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{safetyPlan.socialDistractors}</p>
              </div>
            )}

            {hasContent(safetyPlan.trustedPeople) && (
              <div className="bg-card border border-slate-800 p-4 rounded-xl">
                <h3 className="text-slate-100 font-semibold text-sm mb-1">
                  4. People I can reach out to for help:
                </h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{safetyPlan.trustedPeople}</p>
              </div>
            )}

            {hasContent(safetyPlan.professionals) && (
              <div className="bg-card border border-slate-800 p-4 rounded-xl">
                <h3 className="text-slate-100 font-semibold text-sm mb-1">
                  5. Professionals and crisis lines:
                </h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{safetyPlan.professionals}</p>
              </div>
            )}

            {hasContent(safetyPlan.safeEnvironment) && (
              <div className="bg-card border border-slate-800 p-4 rounded-xl">
                <h3 className="text-slate-100 font-semibold text-sm mb-1">
                  6. Making my space safer:
                </h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{safetyPlan.safeEnvironment}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border border-slate-800 p-4 rounded-xl text-center space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              You haven't built a coping plan yet — and this moment isn't the time to start one. Once this
              passes, I can help you put one together in a couple of minutes.
            </p>
            {onBuildPlanLater && (
              <button
                onClick={onBuildPlanLater}
                className="text-xs font-semibold text-rose-300 hover:text-rose-200 underline underline-offset-2 cursor-pointer"
                id="crisis-build-plan-later-btn"
              >
                Build it when I'm ready
              </button>
            )}
          </div>
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/CrisisOverlay.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire `onBuildPlanLater` in App.tsx**

In `src/App.tsx`, update the `<CrisisOverlay />` usage (around line 534):

```tsx
          <CrisisOverlay
            isOpen={isCrisisOpen}
            onClose={() => setIsCrisisOpen(false)}
            onNavigateToGrounding={() => { setIsCrisisOpen(false); setIsGroundingOpen(true); }}
            onNavigateToBreathing={() => { setIsCrisisOpen(false); setIsGroundingOpen(true); }}
            onBuildPlanLater={() => { setIsCrisisOpen(false); setActiveAuxView("safety_plan" as AuxView); }}
          />
```

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/components/CrisisOverlay.tsx src/components/CrisisOverlay.test.tsx src/App.tsx
git commit -m "feat: declutter CrisisOverlay, add Ride the Wave content, wire build-plan-later"
```

---

### Task 9: Full verification and push (no merge)

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: all test files pass (baseline was 235 files / 2590 tests before this plan; expect that count plus this plan's new test files/cases, all green).

- [ ] **Step 3: Review the diff against the design spec**

Run: `git log --oneline origin/main..HEAD` and `git diff origin/main..HEAD --stat`
Expected: only the files touched by Tasks 1-8 above; nothing outside `docs/superpowers/`, `src/services/`, `src/components/`, `src/App.tsx`, `src/safety.ts`.

- [ ] **Step 4: Push the branch (do NOT merge, do NOT open a PR against main without being asked)**

```bash
git push -u origin feat/safety-layer-redesign
```

- [ ] **Step 5: Report completion**

Summarize for the user: what changed, the final test count, and that the branch is pushed and waiting for their review/merge decision — do not merge or PR-merge to main.

---

## Self-Review Notes

- **Spec coverage:** Task 1 = data fix (spec §D). Tasks 2+4 = create-nudge (spec §B). Task 5 = onboarding slide (spec §A). Tasks 3+6+7+8 = crisis-screen redesign (spec §C: declutter, one primary action already exists via `CrisisLines`, new de-escalation content, validation-first reply, build-plan-later handoff). Task 9 = final verification. All spec sections covered.
- **Placeholder scan:** no TBD/TODO; every step has complete code.
- **Type consistency:** `SafetyPlan` field names (`warningSigns`, `internalCoping`, `socialDistractors`, `trustedPeople`, `professionals`, `safeEnvironment`, `lastUpdatedAt`) used identically across Tasks 2, 5, and 8, matching `src/types.ts`. `go: (target: string) => void` used identically in Tasks 3 and 4. `shouldNudgeToCreateSafetyPlan`/`hasMeaningfulSafetyPlanContent`/`dismissCreateSafetyPlanNudge` names match between Task 2's implementation and Task 4's consumption.
