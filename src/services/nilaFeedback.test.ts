import { describe, it, expect, beforeEach, vi } from "vitest";

const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { recordFeedback, attachSuggestion, loadFeedback, feedbackSummary, pendingContributions, clearFeedback } from "./nilaFeedback";

describe("nilaFeedback", () => {
  beforeEach(() => store.clear());

  it("records ratings and summarises counts (aggregate-only shape)", () => {
    recordFeedback("reply a", "up");
    recordFeedback("reply b", "down");
    recordFeedback("reply c", "up");
    expect(feedbackSummary()).toEqual({ total: 3, up: 2, down: 1, suggestions: 0 });
  });

  it("stores a typed suggestion as a contribution (trimmed) and lists it", () => {
    recordFeedback("bad reply", "down", "  a kinder reply  ");
    recordFeedback("ok reply", "up");
    const contribs = pendingContributions();
    expect(contribs.length).toBe(1);
    expect(contribs[0].suggestion).toBe("a kinder reply");
    expect(feedbackSummary().suggestions).toBe(1);
  });

  it("attaches a suggestion to an existing thumbs-down (one entry, not two)", () => {
    const e = recordFeedback("bad reply", "down");
    attachSuggestion(e.id, "  try this instead  ");
    expect(loadFeedback().length).toBe(1);
    expect(loadFeedback()[0].suggestion).toBe("try this instead");
    expect(feedbackSummary()).toEqual({ total: 1, up: 0, down: 1, suggestions: 1 });
  });

  it("ignores an empty/whitespace suggestion (no contribution)", () => {
    recordFeedback("r", "down", "   ");
    expect(pendingContributions().length).toBe(0);
    expect(loadFeedback()[0].suggestion).toBeUndefined();
  });

  it("ids stay unique even within the same millisecond", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(recordFeedback("r" + i, "up").id);
    expect(ids.size).toBe(50);
  });

  it("caps at 100 (keeps newest) and clears", () => {
    for (let i = 0; i < 130; i++) recordFeedback("r" + i, "up");
    expect(loadFeedback().length).toBe(100);
    expect(loadFeedback().some((f) => f.reply === "r129")).toBe(true);
    clearFeedback();
    expect(loadFeedback().length).toBe(0);
  });
});
