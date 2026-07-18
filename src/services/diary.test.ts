import { describe, it, expect, vi, beforeEach } from "vitest";

// diary.ts → secureData.ts → secureLocal (mocked here). Mocking the leaf module reaches the whole graph,
// so the real diary + secureData run over this seeded store — the mock mechanism the migration relies on.
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { loadDiaryMap, loadDiaryEntries } from "./diary";

beforeEach(() => store.clear());

describe("diary — canonical reader for the date-keyed DBT diary map", () => {
  it("empty map / empty entries when nothing is stored", () => {
    expect(loadDiaryMap()).toEqual({});
    expect(loadDiaryEntries()).toEqual([]);
  });

  it("reads the date-keyed map and flattens to a value array", () => {
    const map = {
      "2026-07-18": { date: "2026-07-18", emotions: {}, skillsUsed: ["TIPP"] },
      "2026-07-17": { date: "2026-07-17", emotions: {}, skillsUsed: [] },
    };
    store.set("nilamind_diary", JSON.stringify(map));
    expect(loadDiaryMap()["2026-07-18"].skillsUsed).toEqual(["TIPP"]);
    expect(loadDiaryEntries()).toHaveLength(2);
    expect(loadDiaryEntries().map((e: any) => e.date).sort()).toEqual(["2026-07-17", "2026-07-18"]);
  });

  it("degrades to {} on a corrupt blob (never throws)", () => {
    store.set("nilamind_diary", "{ half written");
    expect(loadDiaryMap()).toEqual({});
    expect(loadDiaryEntries()).toEqual([]);
  });

  it("degrades to {} if the store somehow holds an array instead of a map", () => {
    store.set("nilamind_diary", JSON.stringify([{ date: "2026-07-18" }]));
    expect(loadDiaryMap()).toEqual({});
  });
});
