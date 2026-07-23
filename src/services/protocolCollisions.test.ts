import { describe, it, expect } from "vitest";
import { PROTOCOLS } from "./protocols";

// Pairs where a high cue overlap is a deliberate, reviewed design choice (stepped care), not a bug.
// Adding an entry here is itself a reviewed decision — see the comment for why.
const ALLOWLISTED_OVERLAPS: ReadonlyArray<readonly [string, string]> = [
  // sleep-wind-down / cbti-sleep: two deliberately-scoped stepped-care protocols for the same
  // presenting complaint (brief on-ramp vs. fuller 4-session program). Both independently omit
  // sleep-restriction therapy for the same bipolar/mania-safety reason — this is not a routing
  // bug. See docs/superpowers/specs/2026-07-19-guided-programs-redesign-design.md §5.
  ["sleep-wind-down", "cbti-sleep"],
];

function isAllowlisted(a: string, b: string): boolean {
  return ALLOWLISTED_OVERLAPS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

describe("protocol forConcerns cue collisions", () => {
  it("no undocumented pair shares more than half of the smaller protocol's cues", () => {
    const offenders: string[] = [];
    for (let i = 0; i < PROTOCOLS.length; i++) {
      for (let j = i + 1; j < PROTOCOLS.length; j++) {
        const a = PROTOCOLS[i];
        const b = PROTOCOLS[j];
        if (isAllowlisted(a.id, b.id)) continue;
        const setA = new Set(a.forConcerns);
        const shared = b.forConcerns.filter((c) => setA.has(c));
        const smaller = Math.min(a.forConcerns.length, b.forConcerns.length);
        if (smaller > 0 && shared.length / smaller > 0.5) {
          offenders.push(`${a.id} <-> ${b.id}: ${shared.length}/${smaller} cues shared (${shared.slice(0, 5).join(", ")}${shared.length > 5 ? ", ..." : ""})`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("every protocol has at least one forConcerns cue (routable)", () => {
    const unroutable = PROTOCOLS.filter((p) => p.forConcerns.length === 0).map((p) => p.id);
    expect(unroutable).toEqual([]);
  });

  it("all 21 protocols are present in the registry", () => {
    expect(PROTOCOLS.length).toBe(21);
  });
});
