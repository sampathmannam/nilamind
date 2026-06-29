import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({ secureLocal: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } }));
vi.mock("./nilaSessions", () => ({ loadNilaTurns: vi.fn(() => []) }));

import { dependencySignal, activeDependencyNudge, dismissDependencyNudge } from "./dependencyGuard";
import { loadNilaTurns } from "./nilaSessions";

const turnsOn = (date: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${date}-${i}`, date, timestamp: "", surface: "coach" as const, snippet: "" }));

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; vi.clearAllMocks(); });

describe("dependencySignal", () => {
  it("fires on heavy + escalating use", () => {
    const turns = [...turnsOn("2026-06-29", 10), ...turnsOn("2026-06-27", 10), ...turnsOn("2026-06-25", 10), ...turnsOn("2026-06-20", 5), ...turnsOn("2026-06-18", 5)];
    const s = dependencySignal(turns, "2026-06-29");
    expect(s.recent7).toBe(30);
    expect(s.prior7).toBe(10);
    expect(s.firing).toBe(true);
  });

  it("does NOT fire on light use", () => {
    expect(dependencySignal(turnsOn("2026-06-29", 5), "2026-06-29").firing).toBe(false);
  });

  it("does NOT fire when heavy but DECLINING (use is already easing)", () => {
    const turns = [...turnsOn("2026-06-29", 28), ...turnsOn("2026-06-20", 40)];
    expect(dependencySignal(turns, "2026-06-29").firing).toBe(false);
  });
});

describe("activeDependencyNudge — week-long dismiss", () => {
  it("fires, then stays dismissed within the week", () => {
    (loadNilaTurns as any).mockReturnValue(turnsOn("2026-06-29", 30));
    expect(activeDependencyNudge("2026-06-29")).toBe(true);
    dismissDependencyNudge("2026-06-29");
    expect(activeDependencyNudge("2026-06-29")).toBe(false);
    expect(activeDependencyNudge("2026-07-02")).toBe(false); // 3 days later — still dismissed
  });
});
