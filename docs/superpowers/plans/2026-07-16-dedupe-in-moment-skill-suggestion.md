# Dedupe In-Moment Skill Suggestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show one skill suggestion per assistant turn (not two), as a real button pair instead of an underlined text link.

**Architecture:** `InMomentInsightCard` (already rendered inline under each assistant message) gains a "Try this skill" / "Not now" button pair, replacing its current "Try it" text link. `ModeScreen`'s separate pinned `SkillOfferCard` — which duplicated the same suggestion above the composer — and its `skillOffer` state are deleted outright. Dismissal is tracked per message index in a new `dismissedSkillMessages: Set<number>` state, mirroring the existing `ratedMessages` pattern.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react, Tailwind classes (no CSS files).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-16-dedupe-in-moment-skill-suggestion-design.md`
- The skill block's dismiss button must NOT carry `aria-label="Not now"` — `ModeScreen.test.tsx:313` already uses `screen.getByLabelText("Not now")` for the unrelated feedback-suggestion prompt's dismiss button; a second element with that aria-label would break `getByLabelText`'s uniqueness guarantee. Use plain button text only (matches `SkillOfferCard`'s existing convention).
- `deriveInMomentInsight`'s `insight` is UI-only and never sent on the wire (`NilaUiMessage.insight` in `src/services/nilaSend.ts:22`) — do not change that contract.
- `filterSkills` import in `ModeScreen.tsx` is pre-existing dead code, unrelated to this change — leave it alone.
- `protocolCard` ("Continue Worry Postponement...") is a distinct concept, already button-based — do not touch it.

---

### Task 1: Buttonize InMomentInsightCard's skill CTA, add dismiss

**Files:**
- Modify: `src/components/InMomentInsightCard.tsx`
- Test: `src/components/InMomentInsightCard.test.tsx`

**Interfaces:**
- Produces: `InMomentInsightCardProps` gains two new optional props:
  - `skillDismissed?: boolean` — when `true`, the entire skill block (icon, label, name/reason, buttons) is omitted, regardless of `skillName`.
  - `onDismissSkill?: () => void` — called when "Not now" is clicked.
  - Existing `onTrySkill?: () => void` unchanged in meaning; the button that calls it is now labelled "Try this skill" (was "Try it").

- [ ] **Step 1: Write the failing tests**

Replace the first test's button-text assertion and add two new tests, in `src/components/InMomentInsightCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import InMomentInsightCard from "./InMomentInsightCard";

describe("InMomentInsightCard", () => {
  afterEach(cleanup);
  it("renders the explainer + skill with citation and a Try this skill button", () => {
    const onTry = vi.fn();
    render(
      <InMomentInsightCard
        explainerTitle="Why anxiety shows up in the body"
        explainerSummary="A racing heart is the body's alarm switching on."
        explainerBasis="Barlow (false-alarm model of anxiety)."
        skillEmoji="🫀"
        skillName="TIPP"
        skillReason="Racing heart or panic sensation"
        onTrySkill={onTry}
      />,
    );
    expect(screen.getByText("Why you might feel this way")).toBeTruthy();
    expect(screen.getByText("Why anxiety shows up in the body")).toBeTruthy();
    expect(screen.getByText(/Barlow/)).toBeTruthy();
    expect(screen.getByText("A skill that may help")).toBeTruthy();
    expect(screen.getByText("TIPP")).toBeTruthy();
    const btn = screen.getByText("Try this skill");
    btn.click();
    expect(onTry).toHaveBeenCalledOnce();
  });

  it("hides the explainer section when no explainer is passed", () => {
    render(
      <InMomentInsightCard
        explainerTitle=""
        explainerSummary=""
        explainerBasis=""
        skillEmoji="💙"
        skillName="Opposite Action"
        skillReason="Low mood or emptiness"
      />,
    );
    expect(screen.queryByText("Why you might feel this way")).toBeNull();
    expect(screen.getByText("A skill that may help")).toBeTruthy();
    expect(screen.getByText("Opposite Action")).toBeTruthy();
  });

  it("hides the skill section + Try button when no skill is passed", () => {
    render(
      <InMomentInsightCard
        explainerTitle="Why anxiety shows up in the body"
        explainerSummary="A racing heart is the body's alarm switching on."
        explainerBasis="Barlow (false-alarm model of anxiety)."
        skillEmoji=""
        skillName=""
        skillReason=""
      />,
    );
    expect(screen.getByText("Why you might feel this way")).toBeTruthy();
    expect(screen.queryByText("A skill that may help")).toBeNull();
    expect(screen.queryByText("Try this skill")).toBeNull();
  });

  it("clicking Not now calls onDismissSkill", () => {
    const onDismiss = vi.fn();
    render(
      <InMomentInsightCard
        explainerTitle=""
        explainerSummary=""
        explainerBasis=""
        skillEmoji="💙"
        skillName="Opposite Action"
        skillReason="Low mood or emptiness"
        onTrySkill={() => {}}
        onDismissSkill={onDismiss}
      />,
    );
    screen.getByText("Not now").click();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("hides the skill section entirely when skillDismissed is true, but keeps the explainer", () => {
    render(
      <InMomentInsightCard
        explainerTitle="Why anxiety shows up in the body"
        explainerSummary="A racing heart is the body's alarm switching on."
        explainerBasis="Barlow (false-alarm model of anxiety)."
        skillEmoji="🫀"
        skillName="TIPP"
        skillReason="Racing heart or panic sensation"
        onTrySkill={() => {}}
        skillDismissed
      />,
    );
    expect(screen.getByText("Why you might feel this way")).toBeTruthy();
    expect(screen.queryByText("A skill that may help")).toBeNull();
    expect(screen.queryByText("TIPP")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify the new/changed ones fail**

Run: `npx vitest run src/components/InMomentInsightCard.test.tsx`
Expected: FAIL — "Try this skill" not found (button still says "Try it"); "Not now" not found; `skillDismissed` test fails because the skill section still renders.

- [ ] **Step 3: Implement the button pair + dismiss**

Replace the full contents of `src/components/InMomentInsightCard.tsx`:

```tsx
// InMomentInsightCard — surfaced under Nila's reply: a brief, research-cited
// "why you might feel this way" explainer + a relevant skill/tool suggestion.
// Pure presentational; the data comes from deriveInMomentInsight (on-device, deterministic).
import React from "react";
import { Lightbulb, Sparkles } from "lucide-react";

interface InMomentInsightCardProps {
  explainerTitle: string;
  explainerSummary: string;
  explainerBasis: string;
  skillEmoji: string;
  skillName: string;
  skillReason: string;
  onTrySkill?: () => void;
  onDismissSkill?: () => void;
  skillDismissed?: boolean;
}

export default function InMomentInsightCard({
  explainerTitle,
  explainerSummary,
  explainerBasis,
  skillEmoji,
  skillName,
  skillReason,
  onTrySkill,
  onDismissSkill,
  skillDismissed,
}: InMomentInsightCardProps) {
  const showSkill = !!skillName && !skillDismissed;

  return (
    <div
      id="in-moment-insight"
      className="mt-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 space-y-2.5"
    >
      {explainerTitle && (
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/90">
              Why you might feel this way
            </p>
            <p className="text-[13px] text-slate-200 leading-snug mt-0.5">{explainerTitle}</p>
            <p className="text-[12px] text-slate-400 leading-snug mt-1">{explainerSummary}</p>
            <p className="text-xs text-slate-500 mt-1 italic">Research: {explainerBasis}</p>
          </div>
        </div>
      )}

      {showSkill && (
        <div className={`flex items-start gap-2 ${explainerTitle ? "pt-2 border-t border-slate-700/50" : ""}`}>
          <Sparkles className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/90">
              A skill that may help
            </p>
            <p className="text-[12px] text-slate-200 leading-snug mt-0.5">
              <span className="mr-1">{skillEmoji}</span>
              <span className="font-medium">{skillName}</span>
              <span className="text-slate-400"> — {skillReason}</span>
            </p>
            <div className="flex gap-2 mt-2">
              {onTrySkill && (
                <button
                  id="in-moment-try-skill"
                  onClick={onTrySkill}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px]"
                >
                  <Sparkles className="w-3 h-3" /> Try this skill
                </button>
              )}
              {onDismissSkill && (
                <button
                  id="in-moment-dismiss-skill"
                  onClick={onDismissSkill}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[12px] transition-colors cursor-pointer min-h-[36px]"
                >
                  Not now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/InMomentInsightCard.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/InMomentInsightCard.tsx src/components/InMomentInsightCard.test.tsx
git commit -m "feat: buttonize InMomentInsightCard's skill CTA, add dismiss"
```

---

### Task 2: Wire ModeScreen — dismiss state, drop SkillOfferCard and skillOffer

**Files:**
- Modify: `src/components/ModeScreen.tsx`
- Test: `src/components/ModeScreen.test.tsx`

**Interfaces:**
- Consumes: `InMomentInsightCard`'s new `skillDismissed?: boolean` and `onDismissSkill?: () => void` props (Task 1).
- Produces: `dismissedSkillMessages: Set<number>` local state (message-index-keyed, mirrors `ratedMessages` at `ModeScreen.tsx:127`), not persisted, reset only on remount.

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block to `src/components/ModeScreen.test.tsx`, near the existing feedback-suggestion tests (after line 317's closing `});`). This does NOT mock `deriveInMomentInsight` — it sends real user text that deterministically matches `suggestSkill`'s lexical `DISTRESS_MAP` ("low", "empty" → the `opposite-action` skill, `src/services/skillSuggest.ts:29`), exactly the way the existing crisis tests in this file exercise the real `scanForCrisis` logic instead of mocking it:

```tsx
describe("in-moment skill suggestion (2026-07-16 dedupe)", () => {
  it("shows exactly one skill suggestion (no pinned duplicate) and it uses buttons", async () => {
    sendToNilaMock.mockResolvedValueOnce({ reply: "That sounds hard.", reachedAI: true, blocked: false });
    render(<ModeScreen />);
    await sendMessage("i feel so low and empty lately");
    await waitFor(() => expect(screen.getByText("That sounds hard.")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Try this skill")).toBeTruthy());
    expect(document.getElementById("skill-offer-card")).toBeNull();
    expect(screen.getAllByText("Opposite Action")).toHaveLength(1);
  });

  it("clicking Not now removes the skill suggestion without wiping the reply", async () => {
    sendToNilaMock.mockResolvedValueOnce({ reply: "That sounds hard.", reachedAI: true, blocked: false });
    render(<ModeScreen />);
    await sendMessage("i feel so low and empty lately");
    await waitFor(() => expect(screen.getByText("Try this skill")).toBeTruthy());
    screen.getByText("Not now").click();
    expect(screen.queryByText("Try this skill")).toBeNull();
    expect(screen.getByText("That sounds hard.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ModeScreen.test.tsx -t "in-moment skill suggestion"`
Expected: FAIL — either `document.getElementById("skill-offer-card")` is non-null (the pinned card still renders) or `screen.getByText("Not now")` finds nothing (no dismiss button exists yet).

- [ ] **Step 3: Remove skillOffer state, SkillOfferCard render, add dismissedSkillMessages**

In `src/components/ModeScreen.tsx`:

1. Delete the imports (around line 26):
```tsx
import SkillOfferCard from "./SkillOfferCard";
```
and (find the exact line — it's near the other service imports):
```tsx
import { suggestSkill } from "../services/skillSuggest";
```

2. Delete the state declaration at `ModeScreen.tsx:108`:
```tsx
  const [skillOffer, setSkillOffer] = useState<Skill | null>(null);
```
and add, next to `ratedMessages` (originally at `ModeScreen.tsx:127`):
```tsx
  const [dismissedSkillMessages, setDismissedSkillMessages] = useState<Set<number>>(new Set());
```

3. In `openCrisis` (around `ModeScreen.tsx:157`), delete the line:
```tsx
      setSkillOffer(null);     // #7 (re-audit): don't offer coping-skill/protocol self-help in reply to a crisis
```
(the comment's guarantee is preserved structurally: `deriveInMomentInsight` is never called on a blocked/crisis turn, so `m.insight` — and therefore the skill block — never exists for that message in the first place.)

4. In the send handler (around `ModeScreen.tsx:433`), delete:
```tsx
      // Suggest a relevant coping skill if the user expressed distress
      setSkillOffer(insight?.skill?.skill ?? null);
```

5. In `handleTrySkill` (around `ModeScreen.tsx:544-554`), delete the now-dead line:
```tsx
    setSkillOffer(null);
```
(leave the rest of the function — the message-append behavior — unchanged).

6. In `startNewConversation` (around `ModeScreen.tsx:629-632`), delete:
```tsx
    setSkillOffer(null);
```

7. At the `InMomentInsightCard` call site (around `ModeScreen.tsx:814-828`), add the two new props:
```tsx
                    {m.role === "assistant" && m.insight && (
                      <InMomentInsightCard
                        explainerTitle={m.insight.explainer?.title ?? ""}
                        explainerSummary={m.insight.explainer?.summary ?? ""}
                        explainerBasis={m.insight.explainer?.basis ?? ""}
                        skillEmoji={m.insight.skill?.emoji ?? ""}
                        skillName={m.insight.skill?.skill.name ?? ""}
                        skillReason={m.insight.skill?.reason ?? ""}
                        skillDismissed={dismissedSkillMessages.has(i)}
                        onDismissSkill={() =>
                          setDismissedSkillMessages((prev) => new Set(prev).add(i))
                        }
                        onTrySkill={
                          m.insight.skill
                            ? () => handleTrySkill(m.insight!.skill!.skill)
                            : undefined
                        }
                      />
                    )}
```

8. Delete the pinned card block (around `ModeScreen.tsx:1084-1093`):
```tsx
          {/* Skill suggestion card — appears when Nila detects distress */}
          {skillOffer && (
            <SkillOfferCard
              skill={skillOffer}
              reason={suggestSkill(messages.filter(m => m.role === "user").pop()?.content || "")?.reason || "This might help"}
              emoji={suggestSkill(messages.filter(m => m.role === "user").pop()?.content || "")?.emoji || "💡"}
              onTry={handleTrySkill}
              onDismiss={() => setSkillOffer(null)}
            />
          )}
```

9. `handleTrySkill`'s parameter is typed `(skill: Skill) => void` and is still used — confirm the `Skill` type import at `ModeScreen.tsx:23` (`import { filterSkills, type Skill } from "../services/skillsLibrary";`) stays; only `suggestSkill` and `SkillOfferCard` imports are removed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ModeScreen.test.tsx`
Expected: PASS — full file, including the two new tests and every pre-existing test in it (crisis wiring, feedback-suggestion UI).

- [ ] **Step 5: Commit**

```bash
git add src/components/ModeScreen.tsx src/components/ModeScreen.test.tsx
git commit -m "fix: remove duplicate pinned skill card, wire button-based dismiss"
```

---

### Task 3: Delete the now-orphaned SkillOfferCard component

**Files:**
- Delete: `src/components/SkillOfferCard.tsx`

**Interfaces:**
- Consumes: nothing (Task 2 already removed the only import site).

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn "SkillOfferCard" src/`
Expected: no output (empty) — if anything prints, stop and investigate before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/SkillOfferCard.tsx
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no test imports the deleted file (confirmed in Step 1), so this is a pure regression check.

- [ ] **Step 4: Run the typechecker**

Run: `npx tsc --noEmit`
Expected: no errors (confirms no other file still references `SkillOfferCard` or the removed `skillOffer` symbol).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete orphaned SkillOfferCard component"
```
