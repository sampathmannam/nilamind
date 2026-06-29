import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory secureLocal so the store is exercised without crypto/IndexedDB.
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import {
  addFact, loadFacts, removeFact,
  addFocus, loadFoci, removeFocus,
  profileContextBlock,
} from "./nilaProfile";

describe("nilaProfile — Core facts", () => {
  beforeEach(() => store.clear());

  it("stores a fact and dedupes by text (case/space-insensitive)", () => {
    addFact("In grad school");
    addFact("  in   grad SCHOOL ");          // same fact → replaces, not duplicated
    addFact("Values family");
    const facts = loadFacts();
    expect(facts.length).toBe(2);
    expect(facts.map((f) => f.text)).toContain("Values family");
  });

  it("ignores empty input and caps at 12 (keeping the newest)", () => {
    expect(addFact("   ")).toBeNull();
    for (let i = 0; i < 20; i++) addFact("fact " + i);
    expect(loadFacts().length).toBe(12);
    expect(loadFacts().some((f) => f.text === "fact 19")).toBe(true);
    expect(loadFacts().some((f) => f.text === "fact 0")).toBe(false);
  });

  it("removes a fact by id", () => {
    const f = addFact("temp fact")!;
    removeFact(f.id);
    expect(loadFacts().length).toBe(0);
  });
});

describe("nilaProfile — Active focus", () => {
  beforeEach(() => store.clear());

  it("upserts the timeframe on a follow-up answer (dynamic questioning)", () => {
    addFocus("preparing for an exam");                       // first mention, no timeframe
    addFocus("Preparing for an exam", "in about 2 weeks");   // their answer fills it in
    const foci = loadFoci();
    expect(foci.length).toBe(1);                             // not duplicated
    expect(foci[0].when).toBe("in about 2 weeks");
  });

  it("caps at 6 and removes by id", () => {
    for (let i = 0; i < 8; i++) addFocus("focus " + i);
    expect(loadFoci().length).toBe(6);
    const id = loadFoci()[0].id;
    removeFocus(id);
    expect(loadFoci().length).toBe(5);
  });
});

describe("nilaProfile — context block", () => {
  beforeEach(() => store.clear());

  it("is empty when there's nothing, and labels both tiers when there is", () => {
    expect(profileContextBlock()).toBe("");
    addFact("in grad school");
    addFocus("preparing for an exam", "in about 2 weeks");
    const block = profileContextBlock();
    expect(block).toContain("About them");
    expect(block).toContain("- in grad school");
    expect(block).toContain("What they're working through right now");
    expect(block).toContain("preparing for an exam (in about 2 weeks)");
  });
});
