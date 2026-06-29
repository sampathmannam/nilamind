import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } },
}));

import { loadPact, hasPact, savePact, ratifyPact, clearPact, isPactStale } from "./pact";

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe("pact — letter to my unwell self", () => {
  it("save → load roundtrip; writtenAt preserved on re-save, ratifiedAt refreshed", () => {
    const t1 = "2026-01-01T00:00:00.000Z", t2 = "2026-02-01T00:00:00.000Z";
    const a = savePact("hold on, you've survived this before", { name: "Sam", contact: "+100" }, t1);
    expect(a.writtenAt).toBe(t1);
    expect(a.ratifiedAt).toBe(t1);
    expect(loadPact()?.person.name).toBe("Sam");
    const b = savePact("new words", { name: "Sam" }, t2);
    expect(b.writtenAt).toBe(t1); // original preserved
    expect(b.ratifiedAt).toBe(t2); // refreshed
  });

  it("hasPact reflects presence; clearPact removes", () => {
    expect(hasPact()).toBe(false);
    savePact("x", { name: "A" });
    expect(hasPact()).toBe(true);
    clearPact();
    expect(hasPact()).toBe(false);
    expect(loadPact()).toBeNull();
  });

  it("ignores empty/garbage (a blank letter is not a pact)", () => {
    savePact("   ", { name: "A" });
    expect(loadPact()).toBeNull();
  });

  it("ratifyPact refreshes ratifiedAt only", () => {
    savePact("x", { name: "A" }, "2026-01-01T00:00:00.000Z");
    const r = ratifyPact("2026-03-01T00:00:00.000Z")!;
    expect(r.writtenAt).toBe("2026-01-01T00:00:00.000Z");
    expect(r.ratifiedAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("isPactStale after the window, pure", () => {
    const p = savePact("x", { name: "A" }, "2026-01-01T00:00:00.000Z");
    expect(isPactStale(p, "2026-02-01T00:00:00.000Z")).toBe(false); // ~31 days
    expect(isPactStale(p, "2026-05-01T00:00:00.000Z")).toBe(true); // ~120 days
    expect(isPactStale(null, "2026-05-01T00:00:00.000Z")).toBe(false);
  });
});
