# Guided Programs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface Nilamind's existing 21-protocol library (currently buried, chat-routed-only) via visible evidence citations and a new browsable "Guided Programs" hub, without touching the AI's "not a therapist" invariant or the existing Tools tab.

**Architecture:** Additive only. Extend the existing `ProtocolCard`/`protocolChat.ts` routing layer with a `basis` citation field; add one new `AuxView` route (`guided_programs`) rendering a new grouped list screen that starts protocols through the same `startProtocolChat()` path chat already uses; add a small step-up nudge from `sleep-wind-down` to `cbti-sleep` on completion, since that's a real gap the design review found. No backend, no new persistence beyond what `protocolProgress.ts` already has, no removal of existing screens or routes.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library, existing `secureLocal`/`protocolProgress` persistence.

## Global Constraints

- Nothing leaves the device — no network calls in any new code (spec §1).
- Nila never claims to be a therapist/counsellor/credentialed — this feature is UI/data-surfacing only, no persona changes (spec §1).
- The nav contract (`src/services/nav.contract.test.ts`) is a frozen golden set — `guided_programs` is added as one deliberate, reviewed entry, not a broader nav restructure (spec §3).
- Existing Tools-tab entries (thought record, safety plan, values-to-action, exposure, relapse plan, DBT diary card) are untouched (spec §3, §7).
- The hub's protocol-switch UX must never silently overwrite an in-progress protocol — always confirm first (spec §3).
- `sleep-wind-down` winning routing ties over `cbti-sleep` is correct, deliberate stepped-care behavior — do NOT invert this (spec §5, corrected after two earlier wrong review passes; see commit `e35d200`).

---

## Task 1: Citation chips on the existing chat protocol-offer card

**Files:**
- Modify: `src/services/protocolChat.ts`
- Modify: `src/services/protocolChat.test.ts`
- Modify: `src/components/ModeScreen.tsx:851` (the `protocolCard.label` render)

**Interfaces:**
- Produces: `ProtocolCard.basis: string` — every `ProtocolCard` now carries the source protocol's citation text, consumed by Task 5's hub cards too.

- [ ] **Step 1: Write the failing test**

Add to `src/services/protocolChat.test.ts` (inside the existing `describe("protocolChat", ...)` block, after the `"offers a matched protocol from user text"` test). Both new tests verified against the real source text — `self-compassion`'s `basis` field contains the phrase "self-compassion" (protocols.ts), so the regex match is against real data, not a guess:

```typescript
  it("includes the protocol's evidence citation on an offer card", () => {
    const card = protocolOfferCard("I hate myself");
    expect(card).not.toBeNull();
    expect(card?.basis).toBeTruthy();
    expect(card?.basis).toMatch(/self-compassion/i);
  });

  it("includes the citation on a continue card too", () => {
    startProtocolChat("behavioral-activation");
    const card = protocolOfferCard("I hate myself");
    expect(card?.active).toBe(true);
    expect(card?.basis).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/protocolChat.test.ts`
Expected: FAIL — `Property 'basis' does not exist on type 'ProtocolCard'` (TypeScript) or `expect(card?.basis).toBeTruthy()` fails with `undefined` is not truthy.

- [ ] **Step 3: Add `basis` to `ProtocolCard` and populate it**

In `src/services/protocolChat.ts`, update the interface and both return sites in `protocolOfferCard`:

```typescript
export interface ProtocolCard {
  protocolId: string;
  title: string;
  label: string;
  active: boolean;
  /** The evidence citation for this protocol (Protocol.basis), shown as a small citation chip. */
  basis: string;
}
```

```typescript
export function protocolOfferCard(userText: string): ProtocolCard | null {
  if (scanForCrisis(userText)) return null;
  const active = getActiveProgress();
  if (active) {
    return {
      protocolId: active.protocol.id,
      title: active.protocol.title,
      label: `Continue ${active.protocol.title} — step ${active.stepIndex + 1} of ${active.total}`,
      active: true,
      basis: active.protocol.basis,
    };
  }
  const offer = protocolOffer(userText);
  if (!offer) return null;
  const priorCompletions = completionCountFor(offer.id);
  const label =
    priorCompletions > 0
      ? `Try ${offer.title} again — you've completed it ${priorCompletions} time${priorCompletions === 1 ? "" : "s"} before`
      : `Try ${offer.title} with me`;
  return { protocolId: offer.id, title: offer.title, label, active: false, basis: offer.basis };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/protocolChat.test.ts`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 5: Render the citation chip in ModeScreen**

In `src/components/ModeScreen.tsx`, find the existing protocol-card button block (around line 845):

```tsx
{protocolCard && (
            <button
              onClick={handleProtocolTap}
              className="w-full text-left px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-colors cursor-pointer min-h-[44px] focus-ring"
              id="protocol-card"
            >
              {protocolCard.label}
            </button>
           )}
```

Replace with:

```tsx
{protocolCard && (
            <button
              onClick={handleProtocolTap}
              className="w-full text-left px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-colors cursor-pointer min-h-[44px] focus-ring"
              id="protocol-card"
            >
              <span className="block">{protocolCard.label}</span>
              <span className="block mt-1 text-[10px] font-normal text-blue-300/70">{protocolCard.basis}</span>
            </button>
           )}
```

- [ ] **Step 6: Run the full test suite for this file and adjacent screen tests**

Run: `npx vitest run src/services/protocolChat.test.ts src/components/ModeScreen.test.tsx`
Expected: PASS. If `ModeScreen.test.tsx` has an existing snapshot or exact-text assertion on the protocol card that this change breaks, update that assertion to match the new two-line structure — do not delete the assertion.

- [ ] **Step 7: Commit**

```bash
git add src/services/protocolChat.ts src/services/protocolChat.test.ts src/components/ModeScreen.tsx
git commit -m "feat(protocols): surface evidence citation on the protocol offer card"
```

---

## Task 2: Cross-protocol cue-collision test (living audit infrastructure)

This replaces a one-time manual audit with a permanent regression test: it computes cue overlap between every pair of the 21 protocols and fails on any *undocumented* high overlap, forcing a human decision (allowlist it with a comment, like the sleep pair, or fix it) rather than letting new collisions creep in silently as protocols are added later.

**Files:**
- Create: `src/services/protocolCollisions.test.ts`

**Interfaces:**
- Consumes: `PROTOCOLS` from `src/services/protocols.ts` (`Protocol[]`, each with `id: string` and `forConcerns: string[]`).

- [ ] **Step 1: Write the test (this IS the audit — there's no separate "implementation" to build first)**

Create `src/services/protocolCollisions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PROTOCOLS } from "./protocols";

// Pairs where a high cue overlap is a deliberate, reviewed design choice (stepped care), not a bug.
// Adding an entry here is itself a reviewed decision — see the comment for why.
const ALLOWLISTED_OVERLAPS: ReadonlyArray<readonly [string, string]> = [
  // sleep-wind-down / cbti-sleep: two deliberately-scoped stepped-care protocols for the same
  // presenting complaint (brief on-ramp vs. fuller 4-session program). Both independently omit
  // sleep-restriction therapy for the same bipolar/mania-safety reason — this is not a routing
  // bug. See docs/superpowers/specs/2026-07-19-guided-programs-redesign-design.md §5.
  ["sleep-wind-down", "cbti-sleep"],
];

function isAllowlisted(a: string, b: string): boolean {
  return ALLOWLISTED_OVERLAPS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

describe("protocol forConcerns cue collisions", () => {
  it("no undocumented pair shares more than half of the smaller protocol's cues", () => {
    const offenders: string[] = [];
    for (let i = 0; i < PROTOCOLS.length; i++) {
      for (let j = i + 1; j < PROTOCOLS.length; j++) {
        const a = PROTOCOLS[i];
        const b = PROTOCOLS[j];
        if (isAllowlisted(a.id, b.id)) continue;
        const setA = new Set(a.forConcerns);
        const shared = b.forConcerns.filter((c) => setA.has(c));
        const smaller = Math.min(a.forConcerns.length, b.forConcerns.length);
        if (smaller > 0 && shared.length / smaller > 0.5) {
          offenders.push(`${a.id} <-> ${b.id}: ${shared.length}/${smaller} cues shared (${shared.slice(0, 5).join(", ")}${shared.length > 5 ? ", ..." : ""})`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("every protocol has at least one forConcerns cue (routable)", () => {
    const unroutable = PROTOCOLS.filter((p) => p.forConcerns.length === 0).map((p) => p.id);
    expect(unroutable).toEqual([]);
  });

  it("all 21 protocols are present in the registry", () => {
    // Pins the count found during the 2026-07-19 design review so a future add/remove is deliberate.
    expect(PROTOCOLS.length).toBe(21);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/services/protocolCollisions.test.ts`
Expected: PASS on all three tests. If the first test fails on a pair other than the allowlisted sleep pair, STOP — do not add it to the allowlist reflexively. Read both protocols' full `basis` text first (same mistake this spec's own drafting made once already) and decide: real gap needing distinct cues, or a second legitimate stepped-care/deliberate-overlap pair worth documenting.

- [ ] **Step 3: Commit**

```bash
git add src/services/protocolCollisions.test.ts
git commit -m "test(protocols): add living cue-collision audit across all 21 protocols"
```

---

## Task 3: Pin the sleep-pair stepped-care precedence explicitly

**Files:**
- Modify: `src/services/protocols.ts:142-168` (the inline `sleep-wind-down` entry)
- Modify: `src/services/protocolCBTI.ts:1-16` (file header)
- Create: `src/services/protocolRouting.test.ts`

**Interfaces:**
- Consumes: `routeToProtocol` from `src/services/protocols.ts` (`(concern: string) => Protocol | null`).

- [ ] **Step 1: Write the failing test — pin the current (correct) tie-break behavior**

Create `src/services/protocolRouting.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { routeToProtocol } from "./protocols";

describe("sleep-pair routing precedence (stepped care, pinned deliberately)", () => {
  it("a generic sleep complaint routes to the brief on-ramp (sleep-wind-down), not the full program", () => {
    // "can't sleep" is a shared cue between both protocols — this MUST resolve to the shorter,
    // lower-friction protocol first. Inverting this is a deliberate product decision, not a
    // one-line fix — see docs/superpowers/specs/2026-07-19-guided-programs-redesign-design.md §5.
    const result = routeToProtocol("I can't sleep");
    expect(result?.id).toBe("sleep-wind-down");
  });

  it("cognitive-arousal sleep language routes directly to the fuller CBT-I program", () => {
    // "sleep anxiety" is an exclusive cbti-sleep cue (not shared with sleep-wind-down) — this
    // routing must be preserved, not collapsed into the wind-down protocol.
    const result = routeToProtocol("I have sleep anxiety every night");
    expect(result?.id).toBe("cbti-sleep");
  });
});
```

- [ ] **Step 2: Run test to verify current state**

Run: `npx vitest run src/services/protocolRouting.test.ts`
Expected: PASS already — this step pins existing (correct) behavior rather than changing it. If it fails, STOP: that means the routing has already changed since the design review and needs re-investigation before continuing this plan.

- [ ] **Step 3: Add explicit code comments documenting the precedence as deliberate**

In `src/services/protocols.ts`, immediately before the `sleep-wind-down` entry (find `id: "sleep-wind-down"` around line 142), add above the `{` that opens that protocol object:

```typescript
  // STEPPED CARE (deliberate, pinned by src/services/protocolRouting.test.ts): this protocol's
  // forConcerns cues overlap heavily with cbti-sleep's, and routeToProtocol()'s tie-break (first
  // match in array order wins) means a generic sleep complaint lands here, not on cbti-sleep. That
  // is correct — this is the brief, low-friction on-ramp; cbti-sleep is the fuller step-up, offered
  // on completion of this one (see protocolChat.ts's stepUpOffer). Do NOT reorder PROTOCOLS or add
  // sleep-wind-down cues to close this "gap" without re-reading both protocols' basis text first.
  {
```

In `src/services/protocolCBTI.ts`, extend the existing top-of-file comment block (after the existing "SAFETY NOTE" paragraph) with:

```typescript
//
// STEPPED CARE: sleep-wind-down (protocols.ts) is the deliberate brief on-ramp for this same
// presenting complaint and wins routing ties on shared cues by design — see the pinning comment
// there and src/services/protocolRouting.test.ts. This protocol is the step-up, offered when
// sleep-wind-down is completed (protocolChat.ts's stepUpOffer), not the default first contact.
```

- [ ] **Step 4: Run the full protocol test suite to confirm nothing broke**

Run: `npx vitest run src/services/protocols.test.ts src/services/protocolRouting.test.ts src/services/protocolCollisions.test.ts`
Expected: PASS (comment-only changes to `protocols.ts`/`protocolCBTI.ts` plus the new pinning test).

- [ ] **Step 5: Commit**

```bash
git add src/services/protocols.ts src/services/protocolCBTI.ts src/services/protocolRouting.test.ts
git commit -m "docs(protocols): pin sleep-wind-down/cbti-sleep stepped-care precedence"
```

---

## Task 4: Step-up edge — offer cbti-sleep on sleep-wind-down completion

**Files:**
- Modify: `src/services/protocolChat.ts`
- Modify: `src/services/protocolChat.test.ts`
- Modify: `src/components/ModeScreen.tsx` (the `handleProtocolTap` "done" branch, around line 461)

**Interfaces:**
- Produces: `stepUpOffer(completedProtocolId: string): ProtocolCard | null` — exported from `protocolChat.ts`, returns a `ProtocolCard` for `cbti-sleep` when `completedProtocolId === "sleep-wind-down"`, else `null`.
- Modifies: `ProtocolChatResult`'s `"done"` variant gains an `id: string` field (the completed protocol's id) so callers can check it.

- [ ] **Step 1: Write the failing test**

Add to `src/services/protocolChat.test.ts`:

```typescript
import { getProtocol } from "./protocols";
```

(add this import at the top alongside the existing imports, if `getProtocol` isn't already imported)

```typescript
describe("stepUpOffer", () => {
  it("offers cbti-sleep after completing sleep-wind-down", () => {
    const card = stepUpOffer("sleep-wind-down");
    expect(card).not.toBeNull();
    expect(card?.protocolId).toBe("cbti-sleep");
    expect(card?.basis).toBe(getProtocol("cbti-sleep")?.basis);
  });

  it("returns null for any other completed protocol", () => {
    expect(stepUpOffer("self-compassion")).toBeNull();
    expect(stepUpOffer("cbti-sleep")).toBeNull();
  });
});

describe("continueProtocolChat done result", () => {
  it("includes the completed protocol's id", () => {
    startProtocolChat("self-compassion");
    for (let i = 0; i < 4; i++) continueProtocolChat();
    const r = continueProtocolChat();
    expect(r.kind).toBe("done");
    if (r.kind === "done") expect(r.id).toBe("self-compassion");
  });
});
```

Also update the top import line in `protocolChat.test.ts` to include `stepUpOffer`:

```typescript
import { startProtocolChat, continueProtocolChat, protocolOfferCard, stepUpOffer } from "./protocolChat";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/protocolChat.test.ts`
Expected: FAIL — `stepUpOffer is not a function` / `Property 'id' does not exist on type '{ kind: "done"; title: string; }'`.

- [ ] **Step 3: Implement `stepUpOffer` and extend the "done" result**

In `src/services/protocolChat.ts`, update `ProtocolChatResult` and `continueProtocolChat`:

```typescript
export type ProtocolChatResult =
  | { kind: "started"; title: string; prompt: string }
  | { kind: "advanced"; title: string; prompt: string }
  | { kind: "done"; title: string; id: string }
  | { kind: "none" };
```

```typescript
export function continueProtocolChat(): ProtocolChatResult {
  const active = getActiveProgress();
  if (!active) return { kind: "none" };
  const next = advanceProtocol();
  if (!next) return { kind: "none" };
  if ("done" in next) return { kind: "done", title: next.protocol.title, id: next.protocol.id };
  return { kind: "advanced", title: next.protocol.title, prompt: next.step.prompt };
}
```

Add `stepUpOffer` after `protocolOfferCard` (and import `getProtocol` at the top of the file alongside the existing `protocols` imports):

```typescript
import { startProtocol, advanceProtocol, getActiveProgress, protocolOffer, completionCountFor, getProtocol } from "./protocolProgress";
```

Wait — `getProtocol` lives in `protocols.ts`, not `protocolProgress.ts`. Use two import lines:

```typescript
import { startProtocol, advanceProtocol, getActiveProgress, protocolOffer, completionCountFor } from "./protocolProgress";
import { getProtocol } from "./protocols";
```

```typescript
/**
 * Offer a step-up program after completing one, when a deliberate stepped-care next step exists.
 * Today this is a single hardcoded edge (sleep-wind-down -> cbti-sleep, see the pinning comments in
 * protocols.ts and protocolCBTI.ts) rather than a generic graph — add edges here explicitly as more
 * are identified, don't build a generic "next protocol" inference system for one known case.
 */
export function stepUpOffer(completedProtocolId: string): ProtocolCard | null {
  if (completedProtocolId !== "sleep-wind-down") return null;
  const next = getProtocol("cbti-sleep");
  if (!next) return null;
  return {
    protocolId: next.id,
    title: next.title,
    label: `Ready for more? ${next.title} builds on what you just practiced, with a fuller program.`,
    active: false,
    basis: next.basis,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/protocolChat.test.ts`
Expected: PASS (all tests, including the 3 new ones).

- [ ] **Step 5: Wire the step-up offer into ModeScreen's completion handler**

In `src/components/ModeScreen.tsx`, find `handleProtocolTap`'s "done" branch:

```tsx
      if (result.kind === "done") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `You've completed ${result.title}. Nice work — small steps add up.` },
        ]);
        setProtocolCard(null);
      } else if (result.kind === "advanced") {
```

Replace with:

```tsx
      if (result.kind === "done") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `You've completed ${result.title}. Nice work — small steps add up.` },
        ]);
        setProtocolCard(stepUpOffer(result.id));
      } else if (result.kind === "advanced") {
```

Add `stepUpOffer` to the existing import line from `protocolChat`:

```tsx
import { protocolOfferCard, startProtocolChat, continueProtocolChat, stepUpOffer, type ProtocolCard } from "../services/protocolChat";
```

- [ ] **Step 6: Run ModeScreen's tests**

Run: `npx vitest run src/components/ModeScreen.test.tsx`
Expected: PASS. If an existing test asserts `protocolCard` is `null` after completing `self-compassion` or another non-sleep-wind-down protocol, it still passes unchanged (`stepUpOffer` returns `null` for those). If an existing test completes `sleep-wind-down` specifically and asserts `protocolCard` is `null` afterward, update that assertion to expect the step-up card instead — do not delete the test.

- [ ] **Step 7: Commit**

```bash
git add src/services/protocolChat.ts src/services/protocolChat.test.ts src/components/ModeScreen.tsx
git commit -m "feat(protocols): offer cbti-sleep step-up on sleep-wind-down completion"
```

---

## Task 5: Guided Programs hub screen + nav wiring

**Files:**
- Modify: `src/services/nav.ts`
- Modify: `src/services/nav.contract.test.ts`
- Create: `src/components/GuidedProgramsScreen.tsx`
- Create: `src/components/GuidedProgramsScreen.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `AuxView` gains `"guided_programs"`; `GuidedProgramsScreen` component with props `{ onStart: (protocolId: string) => void }`.
- Consumes: `PROTOCOLS` from `protocols.ts`; `getActiveProgress` from `protocolProgress.ts` (for the switch-confirm behavior).

- [ ] **Step 1: Write the failing nav contract test**

In `src/services/nav.contract.test.ts`, add `"guided_programs"` to `GOLDEN_AUX`:

```typescript
const GOLDEN_AUX: readonly AuxView[] = [
  "about_nila", "insights", "thought_record", "settings", "behaviour", "reach_out", "assessment",
  "dashboard", "your_data", "nila_memory", "winddown",
  "learn", "medication", "problem_solving", "values_work", "exposure", "relapse_plan", "caregiver", "episode",
  "diary", "dbt_diary_card", "social_rhythm", "ema_checkin", "episode_marker",
  "caregiver_settings", "legal", "sounds", "safety_plan", "values_to_action",
  "guided_programs",
];
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/nav.contract.test.ts`
Expected: FAIL — `KNOWN_AUX_VIEWS matches the golden set` fails because `"guided_programs"` is in `GOLDEN_AUX` but not yet in the real `KNOWN_AUX_VIEWS`. Also the round-trip test fails with a TypeScript error since `"guided_programs"` isn't a valid `AuxView` yet.

- [ ] **Step 3: Add the new route to `nav.ts`**

In `src/services/nav.ts`, add to the `AuxView` type union (alphabetical position doesn't matter, existing list isn't sorted):

```typescript
export type AuxView =
  | "about_nila"
  | "insights"
  | "thought_record"
  | "settings"
  | "behaviour"
  | "assessment"
  | "dashboard"
  | "your_data"
  | "nila_memory"
  | "winddown"
  | "reach_out"
  | "learn"
  | "medication"
  | "problem_solving"
  | "values_work"
  | "exposure"
  | "relapse_plan"
  | "caregiver"
  | "episode"
  | "diary"
  | "dbt_diary_card"
  | "social_rhythm"
  | "ema_checkin"
  | "episode_marker"
  | "caregiver_settings"
  | "legal"
  | "sounds"
  | "safety_plan"
  | "values_to_action"
  | "guided_programs";
```

And to `KNOWN_AUX_VIEWS`:

```typescript
export const KNOWN_AUX_VIEWS: readonly AuxView[] = [
   "about_nila", "insights", "thought_record", "settings", "behaviour", "reach_out", "assessment",
   "dashboard", "your_data", "nila_memory", "winddown",
   "learn", "medication", "problem_solving", "values_work", "exposure", "relapse_plan", "caregiver", "episode",
   "diary",
   "dbt_diary_card",
     "social_rhythm",
      "ema_checkin",
      "episode_marker",
   "caregiver_settings",
   "legal",
   "sounds",
   "safety_plan",
   "values_to_action",
   "guided_programs",
      ];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/nav.contract.test.ts src/services/nav.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the nav route addition**

```bash
git add src/services/nav.ts src/services/nav.contract.test.ts
git commit -m "feat(nav): add guided_programs route (sealed-contract deliberate edit)"
```

- [ ] **Step 6: Write the failing test for GuidedProgramsScreen**

Create `src/components/GuidedProgramsScreen.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GuidedProgramsScreen from "./GuidedProgramsScreen";
import { abandonProtocol, startProtocol } from "../services/protocolProgress";

describe("GuidedProgramsScreen", () => {
  beforeEach(() => abandonProtocol());

  it("renders all 21 protocols", () => {
    render(<GuidedProgramsScreen onStart={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /./ }).length).toBeGreaterThanOrEqual(21);
  });

  it("groups protocols into Quick programs and Deeper modules sections", () => {
    render(<GuidedProgramsScreen onStart={vi.fn()} />);
    expect(screen.getByText("Quick programs")).toBeInTheDocument();
    expect(screen.getByText("Deeper modules")).toBeInTheDocument();
  });

  it("shows the citation for each protocol", () => {
    render(<GuidedProgramsScreen onStart={vi.fn()} />);
    expect(screen.getByText(/Linehan/)).toBeInTheDocument();
  });

  it("tapping a protocol with no active session starts it directly", () => {
    const onStart = vi.fn();
    render(<GuidedProgramsScreen onStart={onStart} />);
    fireEvent.click(screen.getByText("Self-Compassion"));
    expect(onStart).toHaveBeenCalledWith("self-compassion");
  });

  it("tapping a different protocol while one is active shows a switch confirmation instead of starting immediately", () => {
    startProtocol("behavioral-activation");
    const onStart = vi.fn();
    render(<GuidedProgramsScreen onStart={onStart} />);
    fireEvent.click(screen.getByText("Self-Compassion"));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText(/Switch from Behavioral Activation/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Switch"));
    expect(onStart).toHaveBeenCalledWith("self-compassion");
  });

  it("tapping the already-active protocol starts it directly, no confirmation", () => {
    startProtocol("behavioral-activation");
    const onStart = vi.fn();
    render(<GuidedProgramsScreen onStart={onStart} />);
    fireEvent.click(screen.getByText("Behavioral Activation"));
    expect(onStart).toHaveBeenCalledWith("behavioral-activation");
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/components/GuidedProgramsScreen.test.tsx`
Expected: FAIL — `Cannot find module './GuidedProgramsScreen'`.

- [ ] **Step 8: Implement GuidedProgramsScreen**

Create `src/components/GuidedProgramsScreen.tsx`:

```tsx
import React, { useState } from "react";
import { PROTOCOLS, type Protocol } from "../services/protocols";
import { getActiveProgress } from "../services/protocolProgress";

// Grouping axis: PROTOCOLS is the union of 13 protocols defined inline in protocols.ts ("quick
// programs") and 8 imported from their own dedicated protocol*.ts files ("deeper modules"). This is
// a real code-structural distinction, not step count — step counts range 3-7 in the "quick" group
// and 5-10 in the "deeper" group, they overlap, so don't try to regroup by step count later.
const DEEPER_MODULE_IDS = new Set([
  "dbt-skills-training", "act-training", "assertion-training", "cbti-sleep",
  "social-rhythm", "relapse-prevention", "mindfulness-practice", "behavioral-experiments",
]);

function isDeeperModule(p: Protocol): boolean {
  return DEEPER_MODULE_IDS.has(p.id);
}

interface Props {
  onStart: (protocolId: string) => void;
}

export default function GuidedProgramsScreen({ onStart }: Props) {
  const [pendingSwitch, setPendingSwitch] = useState<Protocol | null>(null);
  const active = getActiveProgress();

  const quick = PROTOCOLS.filter((p) => !isDeeperModule(p));
  const deeper = PROTOCOLS.filter(isDeeperModule);

  const handleTap = (p: Protocol) => {
    if (active && active.protocol.id !== p.id) {
      setPendingSwitch(p);
      return;
    }
    onStart(p.id);
  };

  return (
    <div className="p-4 space-y-6">
      <p className="text-sm text-slate-400">
        Real, structured programs Nila can guide you through — each one traces to published research.
      </p>

      {pendingSwitch && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm space-y-3">
          <p>Switch from {active?.protocol.title}? You'll restart it from the beginning next time.</p>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-medium min-h-[44px]"
              onClick={() => {
                const id = pendingSwitch.id;
                setPendingSwitch(null);
                onStart(id);
              }}
            >
              Switch
            </button>
            <button
              className="px-3 py-2 rounded-lg bg-slate-700/50 text-slate-300 text-xs font-medium min-h-[44px]"
              onClick={() => setPendingSwitch(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ProtocolSection title="Quick programs" protocols={quick} onTap={handleTap} />
      <ProtocolSection title="Deeper modules" protocols={deeper} onTap={handleTap} />
    </div>
  );
}

function ProtocolSection({ title, protocols, onTap }: { title: string; protocols: Protocol[]; onTap: (p: Protocol) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase font-mono tracking-widest text-slate-500">{title}</p>
      {protocols.map((p) => (
        <button
          key={p.id}
          onClick={() => onTap(p)}
          className="w-full text-left px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors min-h-[44px] focus-ring"
        >
          <span className="block text-sm font-medium text-slate-200">{p.title}</span>
          <span className="block mt-0.5 text-xs text-slate-500">{p.steps.length} steps</span>
          <span className="block mt-1 text-[10px] text-slate-500">{p.basis}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run src/components/GuidedProgramsScreen.test.tsx`
Expected: PASS on all 6 tests.

- [ ] **Step 10: Wire the screen into App.tsx**

In `src/App.tsx`, add to `AUX_LABELS`:

```typescript
  guided_programs: "Guided Programs",
```

Add the import near the other lazy-loaded screen imports (follow whatever import style — direct or `React.lazy` — the surrounding imports in that block already use):

```typescript
import GuidedProgramsScreen from "./components/GuidedProgramsScreen";
```

Add a case in `renderAuxView`, alongside the other `case "safety_plan":` etc. (before the `default:` case):

```tsx
    case "guided_programs":
      return (
        <GuidedProgramsScreen
          onStart={(protocolId) => {
            startProtocolChat(protocolId);
            onClose();
            onOpenView("nila");
          }}
        />
      );
```

This requires `startProtocolChat` to be imported in `App.tsx`. Add:

```typescript
import { startProtocolChat } from "./services/protocolChat";
```

- [ ] **Step 11: Manually verify the route resolves and renders**

Run: `npx vitest run src/App.test.tsx` (if this file exists — check with `find . -iname "App.test.tsx" | grep -v node_modules` first; if it doesn't exist, skip this step, there's no existing App-level test harness to extend, and inventing one is out of scope for this plan).

- [ ] **Step 12: Commit**

```bash
git add src/components/GuidedProgramsScreen.tsx src/components/GuidedProgramsScreen.test.tsx src/App.tsx
git commit -m "feat(guided-programs): add hub screen, wired to nav and chat start path"
```

---

## Task 6: Today entry card

**Files:**
- Modify: `src/components/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `onOpenView?: (target: string) => void` — the existing prop `DashboardScreen` already receives (see `App.tsx:546`: `<DashboardScreen onOpenView={(target) => { closeTop(); go(target); }} />`).

No new test file — `DashboardScreen.tsx` has no existing component-level test file in this codebase (only its data/logic layer, `dashboardInsights.ts`, is unit tested); adding one now for a single static card is disproportionate scope for this task and inconsistent with the file's established testing pattern. Verify this step visually per Step 3.

- [ ] **Step 1: Add the featured card**

In `src/components/DashboardScreen.tsx`, find the `{(behaviourInsights.length > 0 || proactiveCards.length > 0) && <SectionHeader label="What Nila noticed" />}` line (around line 578) and add the new card immediately before it:

```tsx
        <button
          onClick={() => onOpenView?.("guided_programs")}
          className="w-full text-left p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/15 transition-colors min-h-[44px] focus-ring"
        >
          <p className="text-sm font-medium text-violet-200">Guided Programs</p>
          <p className="mt-1 text-xs text-violet-300/70">
            Real, evidence-based programs — DBT, CBT, and more — you can start any time.
          </p>
        </button>

{(behaviourInsights.length > 0 || proactiveCards.length > 0) && <SectionHeader label="What Nila noticed" />}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit` and `npx eslint src/components/DashboardScreen.tsx`
Expected: no new errors introduced by this change.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open the app, go to Today, confirm the "Guided Programs" card renders near the top, tap it, confirm it opens the hub (Task 5), tap a protocol, confirm it starts in the Nila tab.

- [ ] **Step 4: Commit**

```bash
git add src/components/DashboardScreen.tsx
git commit -m "feat(guided-programs): add Today entry card"
```

---

## Explicitly out of scope for this plan (per spec §7)

- Removing or restructuring existing Tools-tab protocol-adjacent entries (Approach B).
- Any Quiet Room orb-navigation engineering — this plan's UI ships in the current tab-bar IA.
- Any human-counsellor connection feature.
- A generic multi-protocol resume system (the switch-confirm in Task 5 is an honest warning, not a promise of saved state).
- Auditing every one of the 21 protocols' cues by hand beyond what Task 2's automated collision test surfaces — that test is the ongoing audit mechanism; only investigate a pair if the test actually fails.
