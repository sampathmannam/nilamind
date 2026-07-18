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

import {
  loadSecureArray,
  loadSecureRecord,
  writeSecureArray,
  writeSecureRecord,
  updateSecureArray,
  updateSecureRecord,
} from "./secureData";

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

describe("writeSecureArray / writeSecureRecord — authoritative overwrite round-trips", () => {
  it("write→read returns the same array", () => {
    writeSecureArray("k", [{ id: 1 }, { id: 2 }]);
    expect(loadSecureArray("k")).toEqual([{ id: 1 }, { id: 2 }]);
  });
  it("write→read returns the same map", () => {
    writeSecureRecord("k", { a: { n: 1 }, b: { n: 2 } });
    expect(loadSecureRecord("k")).toEqual({ a: { n: 1 }, b: { n: 2 } });
  });
  it("overwrites (not merges) prior contents", () => {
    writeSecureArray("k", [1, 2, 3]);
    writeSecureArray("k", [9]);
    expect(loadSecureArray("k")).toEqual([9]);
  });
});

describe("updateSecureArray — read-modify-write, bail-on-corrupt", () => {
  it("initialises an absent key as [] and writes the mutation", () => {
    const out = updateSecureArray<number>("k", (arr) => [...arr, 1]);
    expect(out).toEqual([1]);
    expect(loadSecureArray("k")).toEqual([1]);
  });
  it("mutates existing items", () => {
    store.set("k", JSON.stringify([1, 2]));
    updateSecureArray<number>("k", (arr) => [...arr, 3]);
    expect(loadSecureArray("k")).toEqual([1, 2, 3]);
  });
  it("BAILS on a present-but-corrupt blob (returns null, never wipes)", () => {
    store.set("k", "{ half written");
    const out = updateSecureArray<number>("k", () => [42]);
    expect(out).toBeNull();
    expect(store.get("k")).toBe("{ half written"); // untouched — not overwritten with [42]
  });
  it("BAILS on a present non-array value (returns null, never wipes)", () => {
    store.set("k", JSON.stringify({ a: 1 }));
    expect(updateSecureArray("k", () => [1])).toBeNull();
    expect(loadSecureRecord("k")).toEqual({ a: 1 });
  });
});

describe("updateSecureRecord — read-modify-write, bail-on-corrupt", () => {
  it("initialises an absent key as {} and writes the mutation", () => {
    const out = updateSecureRecord<number>("k", (m) => ({ ...m, a: 1 }));
    expect(out).toEqual({ a: 1 });
    expect(loadSecureRecord("k")).toEqual({ a: 1 });
  });
  it("adds a key to an existing map without dropping the others", () => {
    store.set("k", JSON.stringify({ "2026-07-17": { n: 1 } }));
    updateSecureRecord<{ n: number }>("k", (m) => {
      m["2026-07-18"] = { n: 2 };
      return m;
    });
    expect(loadSecureRecord("k")).toEqual({ "2026-07-17": { n: 1 }, "2026-07-18": { n: 2 } });
  });
  it("BAILS on a corrupt blob (returns null, never wipes the map)", () => {
    store.set("k", "nope");
    const out = updateSecureRecord("k", () => ({ a: 1 }));
    expect(out).toBeNull();
    expect(store.get("k")).toBe("nope");
  });
  it("BAILS on an array-shaped value (a map was expected)", () => {
    store.set("k", JSON.stringify([1, 2]));
    expect(updateSecureRecord("k", () => ({ a: 1 }))).toBeNull();
  });
});
