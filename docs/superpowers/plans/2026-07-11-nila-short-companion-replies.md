# Nila Short Companion Replies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make on-device Nila reply in short, warm, companion-mode prose (reflect + ask, never lecture), and stop literal markdown (`**`, `*`) from showing in the chat.

**Architecture:** Four coordinated levers, all on-device-safe and reversible: (1) a pure `chatText.ts` with `stripChatMarkdown` + `trimToLastSentence`; (2) a hard decode cap in the llama adapter with clean sentence truncation; (3) render assistant bubbles through the markdown strip; (4) rewrite the active SHORT persona to *show* the companion move via few-shot exemplars + explicit anti-patterns. Prompt tells the 1B *what*; the cap + strip are the belt-and-suspenders for when a 1B ignores instructions.

**Tech Stack:** TypeScript, React (Vite), vitest, `llama-cpp-capacitor`, Capacitor/Android.

## Global Constraints

- **§9 is untouchable.** The crisis directive line in `nila.ts` (`"What you just shared matters more than anything else right now…"`) must remain **verbatim**. `nilaSafetyInvariants.test.ts` must stay green — never edit it to accommodate a persona change.
- **On-device path is non-streaming** (the adapter fires `onToken` once with the full text) — post-processing the final reply is safe and sufficient.
- **Reversibility:** persona voice is behind `USE_SHORT_PERSONA`; keep changes additive so a revert is a one-line flip.
- **No new deps.** `react-markdown` is bundled but deliberately NOT used for chat — we strip, not render (Nila speaks prose).
- Run the FULL suite (`npx vitest run`), never a subset — a subset gave a false green before.

---

### Task 1: Pure chat-text utilities (`chatText.ts`)

**Files:**
- Create: `src/services/chatText.ts`
- Test: `src/services/chatText.test.ts`

**Interfaces:**
- Produces: `stripChatMarkdown(text: string): string` — removes stray markdown (bold/italic/bullets/headers/code) keeping the words.
- Produces: `trimToLastSentence(text: string): string` — if text ends mid-thought (no sentence punctuation at the end), trims back to the last complete sentence; leaves clean or punctuation-less text unchanged.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/chatText.test.ts
import { describe, it, expect } from "vitest";
import { stripChatMarkdown, trimToLastSentence } from "./chatText";

describe("stripChatMarkdown", () => {
  it("removes bold, italics, bullets, headers — keeps the words", () => {
    expect(stripChatMarkdown("That's **great** news.")).toBe("That's great news.");
    expect(stripChatMarkdown("the *why* behind it")).toBe("the why behind it");
    expect(stripChatMarkdown("# Heading\ntext")).toBe("Heading\ntext");
    expect(stripChatMarkdown("* **Reduced Stress:** Calm helps."))
      .toBe("Reduced Stress: Calm helps.");
    expect(stripChatMarkdown("- item one\n- item two")).toBe("item one\nitem two");
    expect(stripChatMarkdown("use `code` here")).toBe("use code here");
  });
  it("leaves plain prose and snake_case untouched", () => {
    expect(stripChatMarkdown("Just a normal sentence.")).toBe("Just a normal sentence.");
    expect(stripChatMarkdown("read snake_case_var now")).toBe("read snake_case_var now");
  });
});

describe("trimToLastSentence", () => {
  it("trims a dangling fragment back to the last complete sentence", () => {
    expect(trimToLastSentence("I hear you. That sounds really")).toBe("I hear you.");
    expect(trimToLastSentence("Calm helps. Your body relaxes. But there")).toBe("Calm helps. Your body relaxes.");
  });
  it("leaves clean or boundary-less text unchanged", () => {
    expect(trimToLastSentence("I hear you.")).toBe("I hear you.");
    expect(trimToLastSentence("What's the hardest part")).toBe("What's the hardest part");
    expect(trimToLastSentence('He said "hi." And then')).toBe('He said "hi."');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/chatText.test.ts`
Expected: FAIL — "Failed to resolve import ./chatText" (module doesn't exist).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/chatText.ts
// Pure chat-text post-processing shared by the on-device reply pipeline and the chat render.
// Nila speaks in plain prose and the chat bubble renders raw text, so any markdown a small model
// emits (bold, bullets) would show literally — strip it. And a length-capped reply must never end
// on a dangling fragment — trim it to the last complete sentence.

/** Strip stray markdown a model may emit, keeping the words. Preserves snake_case (not italics). */
export function stripChatMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")                 // "# Header" -> "Header"
    .replace(/\*\*([^*]+)\*\*/g, "$1")            // **bold** -> bold
    .replace(/__([^_]+)__/g, "$1")                // __bold__ -> bold
    .replace(/^[ \t]*[-*+][ \t]+/gm, "")          // leading "* "/"- "/"+ " bullet markers
    .replace(/\*([^*\n]+?)\*/g, "$1")             // *italic* -> italic
    .replace(/(^|[^\w])_([^_\n]+?)_(?=[^\w]|$)/g, "$1$2") // _italic_ (leaves snake_case alone)
    .replace(/`([^`]+)`/g, "$1")                  // `code` -> code
    .replace(/[ \t]{2,}/g, " ")                   // collapse space runs
    .replace(/\n{3,}/g, "\n\n")                   // collapse blank-line runs
    .trim();
}

/** If `text` was cut mid-thought, trim to the last complete sentence. Clean/boundary-less text is
 *  returned unchanged. */
export function trimToLastSentence(text: string): string {
  const t = text.trimEnd();
  if (!t || /[.!?…]["'’”)\]]?$/.test(t)) return t; // empty or already ends cleanly
  const lastEnd = Math.max(
    t.lastIndexOf("."), t.lastIndexOf("!"), t.lastIndexOf("?"), t.lastIndexOf("…"),
  );
  if (lastEnd === -1) return t; // no sentence boundary — nothing to trim to
  let end = lastEnd + 1;
  while (end < t.length && /["'’”)\]]/.test(t[end])) end++; // keep a trailing quote/bracket
  return t.slice(0, end).trimEnd();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/chatText.test.ts`
Expected: PASS (both describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/services/chatText.ts src/services/chatText.test.ts
git commit -m "feat(chat): pure stripChatMarkdown + trimToLastSentence utils"
```

---

### Task 2: Hard decode cap + sentence truncation in the llama adapter

**Files:**
- Modify: `src/services/llamaCppLlmAdapter.ts` (the real reply `completion()` opts + post-process)
- Modify: `src/services/llamaCppLlmAdapter.test.ts`

**Interfaces:**
- Consumes: `trimToLastSentence` from `./chatText` (Task 1).

- [ ] **Step 1: Write the failing test** (append inside the existing `describe("createLlamaCppBackend", …)`)

```ts
  it("caps reply length (<=128 predicted tokens) so the 1B can't essay", async () => {
    const b = createLlamaCppBackend();
    await flush();
    await b.generate({ system: "s", messages: [{ role: "user", content: "hi" }], onToken: () => {} });
    const realCall = mockCompletion.mock.calls.find(([o]) => (o as { n_predict?: number }).n_predict !== 1);
    expect((realCall![0] as { n_predict: number }).n_predict).toBeLessThanOrEqual(128);
  });

  it("trims a length-cut reply back to the last complete sentence", async () => {
    mockCompletion.mockResolvedValue({ text: "I hear you. That sounds really" });
    const b = createLlamaCppBackend();
    await flush();
    const reply = await b.generate({ system: "s", messages: [{ role: "user", content: "hi" }], onToken: () => {} });
    expect(reply).toBe("I hear you.");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/llamaCppLlmAdapter.test.ts -t "caps reply|trims a length-cut"`
Expected: FAIL — n_predict is 220 (>128); reply is the untrimmed fragment.

- [ ] **Step 3: Write minimal implementation**

In `src/services/llamaCppLlmAdapter.ts`:

Add the import near the top (beside the `toGemmaPrompt` import):
```ts
import { trimToLastSentence } from "./chatText";
```

Change `n_predict: 220,` in the real completion opts to:
```ts
            // Hard cap — a short, warm reply is 1-3 sentences (~60-90 tokens). 128 leaves headroom
            // for the rare "one plain fact then back to them" turn while making an essay physically
            // impossible on a model that ignores the persona's brevity instruction. trimToLastSentence
            // (below) cleans any reply that actually hits this cap so it never ends mid-thought.
            n_predict: 128,
```

Then, after the existing turn-marker cut (`if (cut !== -1) text = text.slice(0, cut).trim();`), add:
```ts
        // If a length cap (not the <end_of_turn> stop) ended the reply, it may dangle mid-sentence —
        // trim back to the last complete sentence so Nila never trails off.
        text = trimToLastSentence(text);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/llamaCppLlmAdapter.test.ts`
Expected: PASS (all, incl. the existing anti-repetition + strip tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/llamaCppLlmAdapter.ts src/services/llamaCppLlmAdapter.test.ts
git commit -m "feat(on-device): cap reply length + sentence-trim so Nila stays short"
```

---

### Task 3: Render assistant bubbles through the markdown strip

**Files:**
- Modify: `src/components/ModeScreen.tsx` (the message map, ~line 486)

**Interfaces:**
- Consumes: `stripChatMarkdown` from `../services/chatText` (Task 1).

- [ ] **Step 1: Add the import** (with the other `../services/...` imports at the top of ModeScreen.tsx)

```ts
import { stripChatMarkdown } from "../services/chatText";
```

- [ ] **Step 2: Apply it to assistant bubbles only** — replace the bubble body `{m.content}` (line ~486) with:

```tsx
                      {m.role === "user" ? m.content : stripChatMarkdown(m.content)}
```

(User text is shown as typed; only Nila's prose is cleaned.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/ModeScreen.tsx
git commit -m "fix(chat): strip stray markdown from Nila's bubbles (no literal ** or *)"
```

---

### Task 4: Companion-mode persona (few-shot + anti-patterns), §9 preserved

**Files:**
- Modify: `src/services/nila.ts` (`NILA_SYSTEM_PROMPT_SHORT` only — the active persona; `USE_SHORT_PERSONA = true`)
- Create: `src/services/nilaVoice.test.ts`

**Interfaces:**
- Consumes: `buildNilaSystem` from `./nila`.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/nilaVoice.test.ts
import { describe, it, expect } from "vitest";
import { buildNilaSystem } from "./nila";

describe("Nila voice (short companion persona)", () => {
  const sys = buildNilaSystem("why does staying calm help");
  it("still carries the §9 crisis directive verbatim", () => {
    expect(sys).toContain("What you just shared matters more than anything else right now");
  });
  it("instructs prose over markdown/lists and against explainer preambles", () => {
    expect(sys.toLowerCase()).toMatch(/no bullet|no markdown|no bold/);
    expect(sys.toLowerCase()).toContain("that's a great question");
  });
  it("shows the reflect-and-ask move via at least one exemplar", () => {
    expect(sys.toLowerCase()).toContain("what's been the hardest part");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/nilaVoice.test.ts`
Expected: FAIL — the anti-markdown / preamble / exemplar strings aren't in the persona yet.

- [ ] **Step 3: Edit `NILA_SYSTEM_PROMPT_SHORT`** — leave the existing lines (including the crisis line) intact; replace the brevity line and append the new guidance + exemplars. Concretely, change the "Match them…" line to end with the additions below (do NOT touch the `- If they mention wanting to die…` crisis line):

Insert these bullet points immediately BEFORE the crisis line:
```
- When they ask you to explain something ("why does X help?", "how do I stop Y?"), don't lecture. Lead them back to themselves: reflect what's underneath the question and ask one gentle thing. Only if they clearly just want the fact, or ask again, give it in ONE plain sentence — then return to them. A tappable tool already sits under your reply; let it carry the how-to.
- Talk like a text from a friend: plain sentences only. No bullet points, no numbered lists, no bold or markdown, no headers. Never open with "That's a great question", "That's a fantastic question", or "I'm sorry to hear that." Just talk.

The voice, by example:
Them: why does staying calm help in hard situations
You: Sounds like calm feels a long way off right now. What's been the hardest part to sit with?

Them: how do i stop overthinking at night
You: Nights can get so loud in your head. What's usually running through your mind when it hits?

Them: no really, just tell me why sleep matters
You: Fair — short version: sleep is when your brain resets its stress and mood, so everything's heavier without it. Has sleep been slipping for you lately?
```

- [ ] **Step 4: Run the voice test + the safety invariants**

Run: `npx vitest run src/services/nilaVoice.test.ts src/services/nilaSafetyInvariants.test.ts`
Expected: PASS both. (If `nilaSafetyInvariants` fails, the crisis line was disturbed — revert and re-apply additively.)

- [ ] **Step 5: Commit**

```bash
git add src/services/nila.ts src/services/nilaVoice.test.ts
git commit -m "feat(nila): companion-mode short persona — reflect+ask, few-shot, no lecturing"
```

---

### Task 5: Full verification + on-device proof

**Files:** none (verification only)

- [ ] **Step 1: Full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass (128+ files), tsc exit 0.

- [ ] **Step 2: Build + install on device** (from the worktree)

Run: `npm run android`
Expected: `BUILD SUCCESSFUL` → `Installed on 1 device` → launched. (installDebug reinstalls `-r`, preserving the side-loaded model.)

- [ ] **Step 3: On-device smoke test** — send Nila a "why/how" prompt (e.g. "why does staying calm help in hard situations") via adb; capture the reply.
Expected: a short (1-3 sentence) reflect-and-ask reply, no bullets, no bold, no "That's a great question" preamble.

- [ ] **Step 4: Hand off to finishing-a-development-branch** to reconcile with `origin/main` (fetch first — parallel repo), open PR / merge, and tag.

## Self-Review

- **Spec coverage:** short replies → Task 4 (persona) + Task 2 (cap); quality/companion mode → Task 4 exemplars; markdown bug → Task 1 + Task 3; belt-and-suspenders → Task 2 cap+trim. All four brainstorm levers covered.
- **§9:** Global Constraint + Task 4 Step 4 guard (nilaSafetyInvariants must stay green) + explicit "don't touch the crisis line."
- **Type consistency:** `stripChatMarkdown`/`trimToLastSentence` names identical across Tasks 1→2→3. `buildNilaSystem` used as-is.
- **Out of scope (noted):** voice/TTS still speaks raw text (new prompt should stop markdown at the source; render-strip covers the visible chat). Dev-only streaming may briefly show partial markdown; on-device is non-streaming so unaffected.
