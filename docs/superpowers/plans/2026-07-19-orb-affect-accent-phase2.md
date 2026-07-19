# Orb Affect Accent (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the two persistence consumers Phase 1 deferred — a `modeEngine.ts` fold and a
compounding-memory digest line — off a new day-bucketed rolling history in `chatAffect.ts`, per
[docs/superpowers/specs/2026-07-19-orb-affect-accent-phase2-design.md](../specs/2026-07-19-orb-affect-accent-phase2-design.md).

**Architecture:** `chatAffect.ts` upgrades from a single-latest-reading latch to a capped map of one
running-average bucket per local calendar day. `modeEngine.ts` reads only *today's* bucket (a same-day
"how's today going" signal, chained into the existing fold sequence). `nilaContext.ts`'s reflection
digest reads the last 7 days with a 3-day minimum-data floor. Both reads are gated behind a new
`setAffectAccentPersistenceEnabled` flag (off by default), layered on top of Phase 1's still-off
`setAffectAccentEnabled`.

**Tech Stack:** TypeScript, Vitest — no new dependencies, no native/Android code touched.

**Spec:** [docs/superpowers/specs/2026-07-19-orb-affect-accent-phase2-design.md](../specs/2026-07-19-orb-affect-accent-phase2-design.md)

## Global Constraints

- Every fold added here carries the exact invariant `foldElevation`/`foldCompoundSignals` already state
  (`modeEngine.ts:82-84,104`): never overrides an explicit self-reported `anxious`/`low`/`elevated`.
- **Revised gate (per Fable review):** may promote from `base === null` unconditionally; may promote
  from `base === "calm"` only when `hasCheckinToday(localDateKey())` is `false` — a same-day "I'm okay"
  must never be re-colored by a soft valence estimate.
- Stored readings in `chatAffect.ts` are the raw blended value from `blendAffect` — never the
  render-side anxious-damped magnitude computed inside `NilaFace.tsx`/`nilaFaceAccent.ts`.
- The digest line is labeled as an automatic estimate with explicit self-report-wins language, and
  contains **no raw numeric valence value** — trend word + day count only.
- Both new read paths (`todayAffectBucket`, `recentAffectDays`) are gated behind
  `setAffectAccentPersistenceEnabled`, off by default. `noteChatAffect` (the write path) is unaffected
  by this flag.
- The clinician report remains out of scope — unchanged from Phase 1's rejection, not reopened here.
- Fail-closed / best-effort throughout — every new code path wrapped in try/catch, matching every
  existing fold and digest line in this codebase.

---

## Task 1: `chatAffect.ts` — day-bucketed rolling history

**Files:**
- Modify: `src/services/chatAffect.ts`
- Modify: `src/services/chatAffect.test.ts` (full rewrite — the single-latest-value shape it tested no
  longer exists)

**Interfaces:**
- Consumes: `secureLocal` from `./secureLocal`; `localDateKey` from `./storageUtils`.
- Produces: `noteChatAffect(reading, now?)` (same call signature as Phase 1 — callers in `ModeScreen.tsx`
  are unaffected), `todayAffectBucket(now?): AffectBucket | null`, `recentAffectDays(days, now?): Array<{date: string} & AffectBucket>`,
  `setAffectAccentPersistenceEnabled(on: boolean): void`, `interface AffectBucket { valence: number; arousal: number; count: number }`.
  Task 2 (`modeEngine.ts`) consumes `todayAffectBucket`/`AffectBucket`. Task 3 (`nilaContext.ts`)
  consumes `recentAffectDays`.

- [ ] **Step 1: Write the failing tests**

Replace `src/services/chatAffect.test.ts` entirely:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import {
  noteChatAffect,
  todayAffectBucket,
  recentAffectDays,
  setAffectAccentPersistenceEnabled,
} from "./chatAffect";
import { localDateKey } from "./storageUtils";

const KEY = "nilamind_chat_affect";
const DAY_MS = 86400000;

beforeEach(() => {
  store = {};
  setAffectAccentPersistenceEnabled(true); // tests exercise the read paths by default; the two "disabled" tests override this locally
});

afterEach(() => {
  setAffectAccentPersistenceEnabled(false); // restore the real default so it can't leak into other test files
});

describe("chatAffect — day-bucketed rolling affect history (Phase 2)", () => {
  it("writes nothing before any note", () => {
    expect(store[KEY]).toBeUndefined();
  });

  it("notes a reading into today's bucket, unmodified — the regression pin for 'stores the raw blended value, never render-damped' (Fable review)", () => {
    const now = Date.now();
    noteChatAffect({ valence: 0.4, arousal: -0.2 }, now);
    const stored = JSON.parse(store[KEY]);
    const today = localDateKey(new Date(now));
    expect(stored[today]).toEqual({ valence: 0.4, arousal: -0.2, count: 1 });
  });

  it("folds a second same-day reading into a running average", () => {
    const now = Date.now();
    noteChatAffect({ valence: 0.4, arousal: -0.2 }, now);
    noteChatAffect({ valence: -0.6, arousal: 0.6 }, now);
    const stored = JSON.parse(store[KEY]);
    const today = localDateKey(new Date(now));
    expect(stored[today].valence).toBeCloseTo(-0.1, 5);
    expect(stored[today].arousal).toBeCloseTo(0.2, 5);
    expect(stored[today].count).toBe(2);
  });

  it("a new local day creates a new bucket rather than continuing yesterday's average", () => {
    const day1 = new Date(2026, 6, 10).getTime();
    const day2 = new Date(2026, 6, 11).getTime();
    noteChatAffect({ valence: -0.9, arousal: 0.9 }, day1);
    noteChatAffect({ valence: 0.5, arousal: -0.5 }, day2);
    const stored = JSON.parse(store[KEY]);
    expect(stored["2026-07-10"]).toEqual({ valence: -0.9, arousal: 0.9, count: 1 });
    expect(stored["2026-07-11"]).toEqual({ valence: 0.5, arousal: -0.5, count: 1 });
  });

  it("prunes buckets older than 30 days on write", () => {
    const old = new Date(2026, 5, 1).getTime();
    const recent = new Date(2026, 6, 19).getTime();
    noteChatAffect({ valence: 0.1, arousal: 0.1 }, old);
    noteChatAffect({ valence: -0.1, arousal: -0.1 }, recent);
    const stored = JSON.parse(store[KEY]);
    expect(stored["2026-06-01"]).toBeUndefined();
    expect(stored["2026-07-19"]).toBeDefined();
  });

  it("defaults `now` to Date.now() when omitted", () => {
    noteChatAffect({ valence: 0.1, arousal: 0.1 });
    const stored = JSON.parse(store[KEY]);
    expect(stored[localDateKey()]).toBeDefined();
  });

  describe("todayAffectBucket", () => {
    it("returns null when there's no bucket for today", () => {
      expect(todayAffectBucket()).toBeNull();
    });

    it("returns today's bucket", () => {
      const now = Date.now();
      noteChatAffect({ valence: 0.3, arousal: 0.2 }, now);
      expect(todayAffectBucket(now)).toEqual({ valence: 0.3, arousal: 0.2, count: 1 });
    });

    it("returns null when persistence reads are disabled, even with data present", () => {
      const now = Date.now();
      noteChatAffect({ valence: 0.3, arousal: 0.2 }, now);
      setAffectAccentPersistenceEnabled(false);
      expect(todayAffectBucket(now)).toBeNull();
    });
  });

  describe("recentAffectDays", () => {
    it("returns [] when there's no history", () => {
      expect(recentAffectDays(7)).toEqual([]);
    });

    it("returns only days within the window, most recent first, sparse days omitted", () => {
      const d1 = new Date(2026, 6, 10).getTime();
      const d2 = new Date(2026, 6, 15).getTime();
      const d3 = new Date(2026, 6, 19).getTime();
      noteChatAffect({ valence: -0.9, arousal: 0.1 }, d1);
      noteChatAffect({ valence: 0.2, arousal: 0.1 }, d2);
      noteChatAffect({ valence: -0.2, arousal: 0.1 }, d3);
      const days = recentAffectDays(7, d3);
      expect(days.map((d) => d.date)).toEqual(["2026-07-19", "2026-07-15"]);
    });

    it("returns [] when persistence reads are disabled, even with data present", () => {
      noteChatAffect({ valence: 0.3, arousal: 0.2 });
      setAffectAccentPersistenceEnabled(false);
      expect(recentAffectDays(7)).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/chatAffect.test.ts`
Expected: FAIL — `todayAffectBucket`/`recentAffectDays`/`setAffectAccentPersistenceEnabled` don't exist
yet, and the running-average/day-key shape doesn't match the current single-latest-value implementation.

- [ ] **Step 3: Rewrite the implementation**

Replace `src/services/chatAffect.ts` entirely:

```ts
import { secureLocal } from "./secureLocal";
import { localDateKey } from "./storageUtils";

// Day-bucketed rolling affect history — Phase 2 of
// docs/superpowers/specs/2026-07-19-orb-affect-accent-phase2-design.md. One running-average bucket per
// LOCAL calendar day (localDateKey — never toISOString, which mis-stamps local evening entries; see
// storageUtils.ts's own doc comment), capped at the last 30 days on every write.
//
// Both READ paths (todayAffectBucket, recentAffectDays) are gated behind
// setAffectAccentPersistenceEnabled, OFF by default — a second, independent gate on top of Phase 1's
// setAffectAccentEnabled (which gates whether noteChatAffect is ever called at all, in ModeScreen.tsx).
// The WRITE path (noteChatAffect) is unaffected by this flag; it always persists whatever it's given.
const KEY = "nilamind_chat_affect";
const RETENTION_DAYS = 30;

export interface AffectBucket {
  valence: number;
  arousal: number;
  count: number;
}

type AffectHistory = Record<string, AffectBucket>;

let _persistenceEnabled = false;

/** Master switch for Phase 2's READ paths — OFF until device-verified. Never affects noteChatAffect. */
export function setAffectAccentPersistenceEnabled(on: boolean): void {
  _persistenceEnabled = on;
}

function loadHistory(): AffectHistory {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function pruneOld(history: AffectHistory, now: number): AffectHistory {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffKey = localDateKey(cutoff);
  const pruned: AffectHistory = {};
  for (const [date, bucket] of Object.entries(history)) {
    if (date >= cutoffKey) pruned[date] = bucket;
  }
  return pruned;
}

/** Fold the raw blended per-turn reading into TODAY's running-average bucket. Best-effort — a missed
 *  write only means a future read sees a stale/absent bucket for today; it never affects the accent's
 *  own render decision (that's computed and rendered from the same-turn value directly in
 *  ModeScreen.tsx/NilaFace.tsx, never from this store). MUST be called with the raw blended head
 *  output, never the render-side anxious-damped magnitude (that damping lives entirely inside
 *  NilaFace.tsx/nilaFaceAccent.ts and is never passed here). */
export function noteChatAffect(reading: { valence: number; arousal: number }, now: number = Date.now()): void {
  try {
    const history = loadHistory();
    const today = localDateKey(new Date(now));
    const existing = history[today];
    const count = (existing?.count ?? 0) + 1;
    const valence = existing ? (existing.valence * existing.count + reading.valence) / count : reading.valence;
    const arousal = existing ? (existing.arousal * existing.count + reading.arousal) / count : reading.arousal;
    history[today] = { valence, arousal, count };
    secureLocal.setItem(KEY, JSON.stringify(pruneOld(history, now)));
  } catch {
    /* best-effort */
  }
}

/** Today's running-average bucket, or null if absent or persistence reads are disabled. Consumed by
 *  modeEngine.ts's foldAffectAccent. */
export function todayAffectBucket(now: number = Date.now()): AffectBucket | null {
  if (!_persistenceEnabled) return null;
  const history = loadHistory();
  return history[localDateKey(new Date(now))] ?? null;
}

/** Buckets from the last `days` local days that have data (sparse — days with no chat produce no
 *  entry), most recent first. [] if absent or persistence reads are disabled. Consumed by
 *  nilaContext.ts's buildReflectionDigest. */
export function recentAffectDays(days: number, now: number = Date.now()): Array<{ date: string } & AffectBucket> {
  if (!_persistenceEnabled) return [];
  const history = loadHistory();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = localDateKey(cutoff);
  return Object.entries(history)
    .filter(([date]) => date > cutoffKey)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, bucket]) => ({ date, ...bucket }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/chatAffect.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/chatAffect.ts src/services/chatAffect.test.ts
git commit -m "feat: upgrade chatAffect.ts to day-bucketed rolling history (Phase 2)"
```

---

## Task 2: `modeEngine.ts` — `foldAffectAccent`

**Files:**
- Modify: `src/services/modeEngine.ts`
- Modify: `src/services/modeEngine.test.ts`

**Interfaces:**
- Consumes: `todayAffectBucket`, `type AffectBucket` from `./chatAffect` (Task 1); `hasCheckinToday`
  (already imported in this file) and `localDateKey` (already imported in this file).
- Produces: `foldAffectAccent(base, today, checkedInToday): UserState | null`, exported and chained
  into `getUserState()`. No later task consumes this directly — it's the final fold in the chain.

- [ ] **Step 1: Write the failing tests**

In `src/services/modeEngine.test.ts`, add near the top, after the existing `vi.mock("./chatElevation", ...)` block:

```ts
vi.mock("./chatAffect", () => ({
  todayAffectBucket: vi.fn(() => null),
}));
```

Add to the existing imports:

```ts
import { foldElevation, foldAffectAccent, getUserState, getNilaQuestion } from "./modeEngine";
import { todayAffectBucket } from "./chatAffect";
import { localDateKey } from "./storageUtils";
```

(replacing the existing `import { foldElevation, getUserState, getNilaQuestion } from "./modeEngine";`
line with the one above, and adding the two new import lines alongside the existing `emaElevationSignal`/`chatElevationSignal` imports).

Add a new `describe` block, after the existing `foldElevation` block:

```ts
describe("foldAffectAccent — today's affect bucket folded into the derived state (never overrides self-report)", () => {
  it("passthrough when base is an explicit distress self-report", () => {
    expect(foldAffectAccent("anxious", { valence: -0.9, arousal: 0.9, count: 10 }, false)).toBe("anxious");
    expect(foldAffectAccent("low", { valence: -0.9, arousal: 0.9, count: 10 }, false)).toBe("low");
  });

  it("passthrough when base is already elevated", () => {
    expect(foldAffectAccent("elevated", { valence: -0.9, arousal: 0.9, count: 10 }, false)).toBe("elevated");
  });

  it("passthrough when there's no bucket, or fewer than 3 readings today", () => {
    expect(foldAffectAccent(null, null, false)).toBe(null);
    expect(foldAffectAccent(null, { valence: -0.9, arousal: 0.9, count: 2 }, false)).toBe(null);
  });

  it("passthrough when the average valence isn't clearly negative", () => {
    expect(foldAffectAccent(null, { valence: -0.3, arousal: 0.9, count: 5 }, false)).toBe(null);
  });

  it("promotes null to low/anxious on the arousal split, unconditional on check-in status", () => {
    expect(foldAffectAccent(null, { valence: -0.7, arousal: 0.1, count: 5 }, false)).toBe("low");
    expect(foldAffectAccent(null, { valence: -0.7, arousal: 0.5, count: 5 }, true)).toBe("anxious");
  });

  it("promotes calm to low/anxious ONLY when there's no check-in today", () => {
    expect(foldAffectAccent("calm", { valence: -0.7, arousal: 0.1, count: 5 }, false)).toBe("low");
    expect(foldAffectAccent("calm", { valence: -0.7, arousal: 0.5, count: 5 }, false)).toBe("anxious");
  });

  it("NEVER overrides a SAME-DAY explicit 'calm' self-report — the invalidation scenario the Fable review caught", () => {
    expect(foldAffectAccent("calm", { valence: -0.9, arousal: 0.9, count: 10 }, true)).toBe("calm");
  });
});
```

In the existing `describe("getUserState — ...")` block's `beforeEach`, add:

```ts
    vi.mocked(todayAffectBucket).mockReset();
    vi.mocked(todayAffectBucket).mockReturnValue(null);
```

Add two new integration tests inside that same `describe("getUserState — ...")` block:

```ts
  it("calm check-in TODAY + strongly negative affect bucket → stays calm (same-day self-report protected)", () => {
    const today = localDateKey();
    vi.mocked(secureLocal.getItem).mockReturnValue(
      JSON.stringify([{ date: today, emotion: "Calm (Nila)", intensity: 4 }]),
    );
    vi.mocked(todayAffectBucket).mockReturnValue({ valence: -0.9, arousal: 0.9, count: 10 });
    expect(getUserState()).toBe("calm");
  });

  it("no check-in at all + strongly negative affect bucket → promotes to low", () => {
    vi.mocked(secureLocal.getItem).mockReturnValue(null);
    vi.mocked(todayAffectBucket).mockReturnValue({ valence: -0.7, arousal: 0.1, count: 5 });
    expect(getUserState()).toBe("low");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/modeEngine.test.ts`
Expected: FAIL — `foldAffectAccent` is not exported from `./modeEngine` yet.

- [ ] **Step 3: Write the implementation**

In `src/services/modeEngine.ts`, add to the imports (after the existing `import { chatElevationSignal } from "./chatElevation";` line):

```ts
import { todayAffectBucket, type AffectBucket } from "./chatAffect";
```

Replace the `getUserState()` function body's try block:

```ts
  try {
    const withElevation = foldElevation(base, higherElevation(emaElevationSignal(), chatElevationSignal()));
    // Then fold compound signals (multi-modal, higher confidence)
    return foldCompoundSignals(withElevation);
  } catch {
    return base;
  }
```

with:

```ts
  try {
    const withElevation = foldElevation(base, higherElevation(emaElevationSignal(), chatElevationSignal()));
    // Then fold compound signals (multi-modal, higher confidence)
    const withCompoundSignals = foldCompoundSignals(withElevation);
    // Then fold today's affect-accent bucket (Phase 2, orb affect accent) — last in the chain since it
    // only ever promotes from null/calm, so it can never undo an elevated/low/anxious promotion any
    // earlier fold already made.
    return foldAffectAccent(withCompoundSignals, todayAffectBucket(), hasCheckinToday(localDateKey()));
  } catch {
    return base;
  }
```

Add the new function after `foldCompoundSignals` (before the `hasCheckedInToday` function):

```ts
/**
 * Fold today's affect-accent bucket (Phase 2 of the orb affect accent — see
 * docs/superpowers/specs/2026-07-19-orb-affect-accent-phase2-design.md §2) into the derived state.
 * NEVER overrides explicit distress self-report (anxious/low) or an already-elevated state — same gate
 * as foldElevation/foldCompoundSignals. May promote from null unconditionally, but may promote from
 * "calm" ONLY when there is no check-in today: a same-day "I'm okay" is self-report and must never be
 * re-colored by a soft valence estimate off a couple of chat messages (unlike foldElevation's override
 * of calm, which is justified by hypomanic self-report being characteristically unreliable — that
 * justification does not transfer to this signal).
 */
export function foldAffectAccent(
  base: UserState | null,
  today: AffectBucket | null,
  checkedInToday: boolean
): UserState | null {
  if (base !== null && base !== "calm") return base;
  if (base === "calm" && checkedInToday) return base;
  if (!today || today.count < 3) return base; // need a real exchange, not one noisy message
  if (today.valence > -0.4) return base; // not clearly negative
  return today.arousal >= 0.2 ? "anxious" : "low";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/modeEngine.test.ts`
Expected: PASS (existing tests + 7 new `foldAffectAccent` unit tests + 2 new integration tests, all green)

- [ ] **Step 5: Commit**

```bash
git add src/services/modeEngine.ts src/services/modeEngine.test.ts
git commit -m "feat: fold today's affect-accent bucket into getUserState (Phase 2)"
```

---

## Task 3: `nilaContext.ts` — "Conversation tone" digest line

**Files:**
- Modify: `src/services/nilaContext.ts`
- Modify: `src/services/nilaContext.digest.test.ts`

**Interfaces:**
- Consumes: `recentAffectDays` from `./chatAffect` (Task 1).
- Produces: nothing for later tasks — this is the final consumer wired in this plan.

- [ ] **Step 1: Write the failing tests**

In `src/services/nilaContext.digest.test.ts`, add to the imports:

```ts
import { setAffectAccentPersistenceEnabled } from "./chatAffect";
import { localDateKey } from "./storageUtils";
```

Add after the existing `beforeEach` block:

```ts
afterEach(() => {
  setAffectAccentPersistenceEnabled(false); // restore the real default so it can't leak into other test files
});
```

(Note: this requires `afterEach` to be added to the `vitest` import at the top of the file — change
`import { vi, describe, it, expect, beforeEach } from "vitest";` to
`import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";`.)

Add a new `describe` block at the end of the file:

```ts
describe("buildReflectionDigest — Conversation tone line (Phase 2)", () => {
  function setAffectHistory(days: number) {
    const now = Date.now();
    const history: Record<string, { valence: number; arousal: number; count: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now - i * 86400000);
      history[localDateKey(d)] = { valence: -0.6, arousal: 0.1, count: 5 };
    }
    store.set("nilamind_chat_affect", JSON.stringify(history));
  }

  it("is absent when persistence reads are disabled, even with data present", () => {
    setAffectHistory(4); // persistence flag left at its real default (disabled) — not enabled in this test
    expect(buildReflectionDigest()).not.toContain("Conversation tone");
  });

  it("is absent below the 3-distinct-day floor", () => {
    setAffectAccentPersistenceEnabled(true);
    setAffectHistory(2);
    expect(buildReflectionDigest()).not.toContain("Conversation tone");
  });

  it("appears with the trend word and provenance framing, never a raw number, once the floor is cleared", () => {
    setAffectAccentPersistenceEnabled(true);
    setAffectHistory(4);
    const d = buildReflectionDigest();
    expect(d).toContain("Conversation tone");
    expect(d).toContain("trended difficult");
    expect(d).toContain("automatic tone estimate");
    expect(d).toContain("trust what they said");
    const toneLine = d.split("\n").find((l) => l.includes("Conversation tone"));
    expect(toneLine).toBeDefined();
    expect(toneLine).not.toMatch(/-?\d\.\d/); // no raw decimal number in the tone line specifically
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/nilaContext.digest.test.ts`
Expected: FAIL — the "Conversation tone" line doesn't exist yet, so the "appears with..." test fails
(the two "absent" tests may already pass vacuously — that's fine, they still document the required
behavior and will keep passing once the line is added).

- [ ] **Step 3: Write the implementation**

In `src/services/nilaContext.ts`, add to the imports (after the existing `import { DAY_MS, localDateKey} from "./storageUtils";` line):

```ts
import { recentAffectDays } from "./chatAffect";
```

In `buildReflectionDigest()`, add immediately before the final `return lines.join("\n");`:

```ts
  try {
    const affectDays = recentAffectDays(7);
    if (affectDays.length >= 3) { // minimum-data floor — a single bad day never asserts a "trend"
      const avgValence = affectDays.reduce((s, d) => s + d.valence, 0) / affectDays.length;
      const trend = avgValence <= -0.2 ? "trended difficult" : avgValence >= 0.2 ? "trended positive" : "stayed mixed";
      lines.push(
        `Conversation tone (${affectDays.length}d, an automatic tone estimate — not something they said): ` +
        `${trend}. If this conflicts with what they've told you directly (e.g. a check-in), trust what they said.`
      );
    }
  } catch {
    /* best-effort — matches every other block in this function */
  }

```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/nilaContext.digest.test.ts`
Expected: PASS (existing 3 tests + 3 new tests, all green)

- [ ] **Step 5: Commit**

```bash
git add src/services/nilaContext.ts src/services/nilaContext.digest.test.ts
git commit -m "feat: add Conversation-tone digest line for the reflection pipeline (Phase 2)"
```

---

## Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all suites green — no regressions (every new/changed code path is either a pure
function with its own dedicated tests, or gated behind `setAffectAccentPersistenceEnabled`, which
stays `false` by default in every existing test that doesn't explicitly enable it).

- [ ] **Step 2: Run the type checker**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Confirm both flags remain off**

Run: `grep -rn "setAffectAccentPersistenceEnabled(true)\|setAffectAccentEnabled(true)" src/main.tsx`
Expected: no matches — this plan does not flip either flag; both stay manual, gated on their own
device-verification passes (Phase 1's own on-device pass is still pending per its plan's Task 9).

## Explicitly out of scope for this plan

- Flipping `setAffectAccentPersistenceEnabled` or `setAffectAccentEnabled` on by default.
- The clinician report as a consumer.
- Exit hysteresis for the boundary-flapping risk named in the Phase 2 spec's Design §2 — flagged for
  a future on-device pass to decide whether it's actually needed.
- Any additional `AffectBucket` fields beyond `{valence, arousal, count}`.
- A UI surface for `recentAffectDays()` beyond feeding the digest.
