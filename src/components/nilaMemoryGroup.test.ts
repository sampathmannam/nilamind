import { describe, it, expect } from "vitest";
import { groupByKind, KIND_LABELS } from "./NilaMemoryScreen";
import type { Insight } from "../services/nilaInsights";

const ins = (kind: Insight["kind"], text: string): Insight =>
  ({ id: text, kind, text, date: "2026-06-20", source: "reflection" });

describe("groupByKind", () => {
  it("buckets insights under their kind, omitting empty groups, in a stable order", () => {
    const groups = groupByKind([ins("pattern", "p1"), ins("value", "v1"), ins("pattern", "p2")]);
    expect(groups.map((g) => g.kind)).toEqual(["pattern", "value"]);
    expect(groups[0].items.map((i) => i.text)).toEqual(["p1", "p2"]);
  });
  it("has a friendly label for every kind", () => {
    for (const k of ["working_through", "what_helps", "pattern", "context", "value"] as const) {
      expect(KIND_LABELS[k]).toBeTruthy();
    }
  });
});
