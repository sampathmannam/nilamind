import { describe, it, expect } from "vitest";
import { secureLocal, appendToSecureArray } from "./secureLocal";

// Audit finding (2026-07-06): the shared arrays (nilamind_checkins / _episodes / _diary) were read-modify-written
// from ~5 call sites, each doing getItem→JSON.parse→push→setItem with an await somewhere in between — so two
// interleaved writers could serialize a stale snapshot and DROP an entry (last-writer-wins). One atomic,
// fully-synchronous append primitive (no await inside → no interleave on single-threaded JS) closes that.
describe("appendToSecureArray — atomic append that can't drop an entry", () => {
  it("creates the array when the key is empty", () => {
    const k = "test_append_empty";
    secureLocal.removeItem(k);
    expect(appendToSecureArray(k, { id: 1 })).toEqual([{ id: 1 }]);
    expect(JSON.parse(secureLocal.getItem(k)!)).toEqual([{ id: 1 }]);
  });
  it("appends without dropping earlier entries across successive calls", () => {
    const k = "test_append_seq";
    secureLocal.removeItem(k);
    appendToSecureArray(k, { id: 1 });
    appendToSecureArray(k, { id: 2 });
    const out = appendToSecureArray(k, { id: 3 }) as Array<{ id: number }>;
    expect(out.map((e) => e.id)).toEqual([1, 2, 3]);
  });
  it("treats a corrupt stored value as empty (never throws)", () => {
    const k = "test_append_corrupt";
    secureLocal.setItem(k, "{not json");
    expect(appendToSecureArray(k, { id: 9 })).toEqual([{ id: 9 }]);
  });
  it("caps to the most recent N when a cap is given", () => {
    const k = "test_append_cap";
    secureLocal.removeItem(k);
    for (const id of [1, 2, 3, 4]) appendToSecureArray(k, { id }, 2);
    expect((JSON.parse(secureLocal.getItem(k)!) as Array<{ id: number }>).map((e) => e.id)).toEqual([3, 4]);
  });
});
