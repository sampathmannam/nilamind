import { describe, it, expect, vi, beforeEach } from "vitest";

// House-style in-memory secureLocal mock (hoisted). secureData is NOT mocked — its real impl runs over
// this mocked getItem, exactly as it does in production over the real secureLocal.
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { loadSecureArray, loadSecureRecord } from "./secureData";

beforeEach(() => store.clear());

describe("loadSecureArray", () => {
  it("returns [] for a missing key", () => {
    expect(loadSecureArray("k")).toEqual([]);
  });
  it("returns the parsed array", () => {
    store.set("k", JSON.stringify([1, 2, 3]));
    expect(loadSecureArray<number>("k")).toEqual([1, 2, 3]);
  });
  it("returns [] (never throws) for a corrupt blob", () => {
    store.set("k", "{ not json");
    expect(loadSecureArray("k")).toEqual([]);
  });
  it("returns [] for a non-array (object) value", () => {
    store.set("k", JSON.stringify({ a: 1 }));
    expect(loadSecureArray("k")).toEqual([]);
  });
});

describe("loadSecureRecord", () => {
  it("returns {} for a missing key", () => {
    expect(loadSecureRecord("k")).toEqual({});
  });
  it("returns the parsed object map", () => {
    store.set("k", JSON.stringify({ a: 1, b: 2 }));
    expect(loadSecureRecord<number>("k")).toEqual({ a: 1, b: 2 });
  });
  it("returns {} (never throws) for a corrupt blob", () => {
    store.set("k", "nope");
    expect(loadSecureRecord("k")).toEqual({});
  });
  it("returns {} for an array-shaped value (a map is expected)", () => {
    store.set("k", JSON.stringify([1, 2]));
    expect(loadSecureRecord("k")).toEqual({});
  });
  it("returns {} for a null value", () => {
    store.set("k", "null");
    expect(loadSecureRecord("k")).toEqual({});
  });
});
