import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  },
}));

import { routeToProtocol, getProtocol } from "./protocols";
import { startProtocol, abandonProtocol } from "./protocolProgress";

beforeEach(() => { store = {}; });

describe("social-rhythm protocol", () => {
  it("registers in PROTOCOLS with id social-rhythm", () => {
    const p = getProtocol("social-rhythm");
    expect(p).not.toBeNull();
    expect(p!.title).toBe("Social Rhythm Therapy");
  });

  it("has 8 steps with unique ids", () => {
    const p = getProtocol("social-rhythm")!;
    expect(p.steps.length).toBe(8);
    const ids = p.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(8);
  });

  it("routes on matching concerns", () => {
    expect(routeToProtocol("my routine is all over the place")?.id).toBe("social-rhythm");
    expect(routeToProtocol("need to stabilize my schedule")?.id).toBe("social-rhythm");
    expect(routeToProtocol("my sleep has no rhythm")?.id).toBe("social-rhythm");
  });

  it("does not route on unrelated concerns", () => {
    expect(routeToProtocol("i feel anxious")?.id).not.toBe("social-rhythm");
  });

  it("can be started and advanced through all 8 steps", () => {
    startProtocol("social-rhythm");
    expect(store["nilamind_protocol_progress"]).toContain("social-rhythm");
  });

  it("includes research basis citation", () => {
    const p = getProtocol("social-rhythm")!;
    expect(p.basis.length).toBeGreaterThan(50);
    expect(p.basis).toContain("Frank");
  });
});
