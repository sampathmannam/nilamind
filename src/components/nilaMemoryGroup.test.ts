import { describe, it, expect } from "vitest";
import { groupByKind } from "./NilaMemoryScreen";
import type { Insight } from "../services/nilaInsights";

const ins = (kind: Insight["kind"], text: string): Insight =>
  ({ id: text, kind, text, date: "2026-06-20", source: "reflection" });

describe("groupByKind", () => {
  it("buckets insights under their kind, omitting empty groups, in a stable order", () => {
    const groups = groupByKind([ins("pattern", "p1"), ins("value", "v1"), ins("pattern", "p2")]);
    expect(groups.map((g) => g.kind)).toEqual(["pattern", "value"]);
    expect(groups[0].items.map((i) => i.text)).toEqual(["p1", "p2"]);
  });
  // 2026-08-06: KIND_LABELS (a static object) was replaced by live t() lookups (KIND_I18N_KEYS)
  // so a language switch mid-session updates these labels, matching every other localized string
  // in the app. Assert through groupByKind's actual output instead of a removed static export.
  it("has a friendly label for every kind", () => {
    const all: Insight[] = ["working_through", "what_helps", "pattern", "context", "value"]
      .map((k, i) => ins(k as Insight["kind"], `item${i}`));
    const groups = groupByKind(all);
    expect(groups).toHaveLength(5);
    for (const g of groups) expect(g.label).toBeTruthy();
  });
});
