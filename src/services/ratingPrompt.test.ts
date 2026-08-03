import { vi, describe, it, expect, beforeEach } from "vitest";

const ls = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
});

import {
  recordPositiveSession,
  shouldPromptRating,
  dismissRatingPrompt,
  onUserRated,
  resetRatingState,
} from "./ratingPrompt";

beforeEach(() => ls.clear());

describe("ratingPrompt", () => {
  it("recordPositiveSession increments count", () => {
    recordPositiveSession();
    recordPositiveSession();
    recordPositiveSession();
    expect(Number(ls.get("nilamind_rating_session_count") || "0")).toBe(3);
  });

  it("shouldPromptRating returns false below threshold (4 sessions)", () => {
    for (let i = 0; i < 4; i++) recordPositiveSession();
    expect(shouldPromptRating()).toBe(false);
  });

  it("shouldPromptRating returns true at threshold (5 sessions)", () => {
    for (let i = 0; i < 5; i++) recordPositiveSession();
    expect(shouldPromptRating()).toBe(true);
  });

  it("shouldPromptRating returns false within cooldown after dismiss", () => {
    for (let i = 0; i < 5; i++) recordPositiveSession();
    dismissRatingPrompt();
    expect(shouldPromptRating()).toBe(false);
  });

  it("dismissRatingPrompt sets cooldown timestamp", () => {
    const before = Date.now();
    dismissRatingPrompt();
    const after = Date.now();
    const ts = Number(ls.get("nilamind_rating_last_prompted_at"));
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("onUserRated resets count and sets cooldown", () => {
    for (let i = 0; i < 5; i++) recordPositiveSession();
    onUserRated();
    expect(ls.get("nilamind_rating_session_count")).toBe("0");
    expect(ls.has("nilamind_rating_last_prompted_at")).toBe(true);
  });

  it("resetRatingState clears all keys", () => {
    for (let i = 0; i < 5; i++) recordPositiveSession();
    dismissRatingPrompt();
    resetRatingState();
    expect(ls.has("nilamind_rating_session_count")).toBe(false);
    expect(ls.has("nilamind_rating_last_prompted_at")).toBe(false);
  });
});
