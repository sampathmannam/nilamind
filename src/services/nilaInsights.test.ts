import { vi, describe, it, expect, beforeEach } from "vitest";
import { runReflection, shouldReflectToday } from "./nilaInsights";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import {
  fingerprint, loadInsights, saveInsights, capInsights,
  loadTombstones, addTombstone, type Insight,
  reconcile, upsertUserInsight, editInsight, deleteInsight, insightsContextBlock,
} from "./nilaInsights";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";

const ins = (over: Partial<Insight> = {}): Insight => ({
  id: over.id ?? "ins_x", kind: over.kind ?? "pattern",
  text: over.text ?? "Evenings are hard for them.",
  date: over.date ?? "2026-06-20", source: over.source ?? "reflection",
});

beforeEach(() => store.clear());

describe("fingerprint", () => {
  it("normalizes case, whitespace, NFKC and trailing punctuation", () => {
    expect(fingerprint("pattern", "  Evenings   are HARD!! ")).toBe(fingerprint("pattern", "evenings are hard"));
  });
  it("is kind-scoped", () => {
    expect(fingerprint("pattern", "x")).not.toBe(fingerprint("value", "x"));
  });
});

describe("load/save", () => {
  it("round-trips and drops malformed entries", () => {
    store.set("nilamind_nila_insights", JSON.stringify([ins(), { junk: true }]));
    expect(loadInsights()).toHaveLength(1);
  });
  it("returns [] on absent/garbage", () => {
    expect(loadInsights()).toEqual([]);
    store.set("nilamind_nila_insights", "{not json");
    expect(loadInsights()).toEqual([]);
  });
});

describe("capInsights (partition — user never evicted)", () => {
  it("keeps ALL user items even when they exceed the cap", () => {
    const users = Array.from({ length: 22 }, (_, i) => ins({ id: "u" + i, source: "user", text: "u" + i }));
    const refl = Array.from({ length: 3 }, (_, i) => ins({ id: "r" + i, source: "reflection", text: "r" + i }));
    const out = capInsights([...users, ...refl]);
    expect(out.filter((i) => i.source === "user")).toHaveLength(22);
    expect(out.filter((i) => i.source === "reflection")).toHaveLength(0);
  });
  it("fills remaining slots with NEWEST reflection items", () => {
    const users = Array.from({ length: 18 }, (_, i) => ins({ id: "u" + i, source: "user", text: "u" + i }));
    const refl = [
      ins({ id: "old", source: "reflection", text: "old", date: "2026-01-01" }),
      ins({ id: "new1", source: "reflection", text: "new1", date: "2026-06-20" }),
      ins({ id: "new2", source: "reflection", text: "new2", date: "2026-06-19" }),
    ];
    const out = capInsights([...users, ...refl]);
    const kept = out.filter((i) => i.source === "reflection").map((i) => i.id);
    expect(kept).toEqual(["new1", "new2"]); // 2 slots, oldest dropped
  });
});

describe("tombstones", () => {
  it("dedupes and survives a round-trip", () => {
    addTombstone("pattern|a");
    addTombstone("pattern|a");
    addTombstone("value|b");
    expect(loadTombstones().sort()).toEqual(["pattern|a", "value|b"]);
  });
});

describe("reconcile (user always wins)", () => {
  const mint = () => { let n = 0; return () => "m" + n++; };
  it("keeps user items verbatim and drops proposals that duplicate them", () => {
    const cur: Insight[] = [ins({ id: "u1", source: "user", kind: "value", text: "Family matters most." })];
    const out = reconcile(cur, [{ kind: "value", text: "family matters most" }], new Set(), "2026-06-21", mint());
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("u1");
    expect(out[0].source).toBe("user");
  });
  it("drops tombstoned proposals (never re-adds)", () => {
    const out = reconcile([], [{ kind: "pattern", text: "Evenings are hard." }],
      new Set([fingerprint("pattern", "Evenings are hard.")]), "2026-06-21", mint());
    expect(out).toEqual([]);
  });
  it("dedupes within the proposal", () => {
    const out = reconcile([], [{ kind: "pattern", text: "A." }, { kind: "pattern", text: "a" }], new Set(), "2026-06-21", mint());
    expect(out).toHaveLength(1);
  });
  it("carries over id + original date for an unchanged reflection insight", () => {
    const cur: Insight[] = [ins({ id: "r1", source: "reflection", kind: "pattern", text: "Evenings are hard.", date: "2026-01-01" })];
    const out = reconcile(cur, [{ kind: "pattern", text: "Evenings are hard." }], new Set(), "2026-06-21", mint());
    expect(out[0].id).toBe("r1");
    expect(out[0].date).toBe("2026-01-01");
  });
  it("replaces the reflection set: an old reflection insight not re-proposed is dropped", () => {
    const cur: Insight[] = [ins({ id: "r1", source: "reflection", text: "Stale note." })];
    const out = reconcile(cur, [{ kind: "value", text: "Fresh value." }], new Set(), "2026-06-21", mint());
    expect(out.map((i) => i.text)).toEqual(["Fresh value."]);
  });
});

describe("CRUD", () => {
  it("editInsight tombstones the pre-edit text and marks the item user-owned", () => {
    store.set("nilamind_nila_insights", JSON.stringify([ins({ id: "r1", source: "reflection", kind: "pattern", text: "Mornings are hard." })]));
    editInsight("r1", "Evenings are hard.");
    expect(loadInsights()[0]).toMatchObject({ id: "r1", source: "user", text: "Evenings are hard." });
    expect(loadTombstones()).toContain(fingerprint("pattern", "Mornings are hard."));
  });
  it("deleteInsight removes the item and tombstones it", () => {
    store.set("nilamind_nila_insights", JSON.stringify([ins({ id: "r1", kind: "value", text: "Old value." })]));
    deleteInsight("r1");
    expect(loadInsights()).toEqual([]);
    expect(loadTombstones()).toContain(fingerprint("value", "Old value."));
  });
  it("upsertUserInsight promotes a matching reflection insight to user-owned", () => {
    store.set("nilamind_nila_insights", JSON.stringify([ins({ id: "r1", source: "reflection", kind: "what_helps", text: "Walking helps." })]));
    upsertUserInsight("what_helps", "walking helps");
    const all = loadInsights();
    expect(all).toHaveLength(1);
    expect(all[0].source).toBe("user");
  });
});

describe("insightsContextBlock", () => {
  it("formats as '- text' lines newest-first, or '' when empty", () => {
    expect(insightsContextBlock()).toBe("");
    store.set("nilamind_nila_insights", JSON.stringify([
      ins({ id: "a", text: "Older.", date: "2026-01-01" }),
      ins({ id: "b", text: "Newer.", date: "2026-06-20" }),
    ]));
    expect(insightsContextBlock()).toBe("- Newer.\n- Older.");
  });
});

const ls = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
});

const ymdLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = ymdLocal(new Date());

function backendReturning(reply: string): LocalLlmBackend {
  return { id: "fake", isReady: () => true, generate: async () => reply };
}
// Records the messages handed to the model so we can assert the reflection payload is derived-only.
function recordingBackend(reply: string) {
  const calls: { messages: { role: string; content: string }[] }[] = [];
  const backend: LocalLlmBackend = {
    id: "fake", isReady: () => true,
    generate: async ({ messages }) => { calls.push({ messages }); return reply; },
  };
  return { backend, calls };
}

describe("runReflection (on-device)", () => {
  beforeEach(() => { store.clear(); ls.clear(); registerLocalLlmBackend(null); (globalThis as any).__resetReflectionBootGuard?.(); });

  it("valid array → reconciles and adds insights, consumes the day", async () => {
    registerLocalLlmBackend(backendReturning('[{"kind":"pattern","text":"Evenings are hard."}]'));
    await runReflection("Check-ins (30d): 3.");
    expect(loadInsights().map((i) => i.text)).toContain("Evenings are hard.");
    expect(ls.get("nilamind_last_reflected")).toBe(TODAY);
  });

  it("parse failure (garbled/non-JSON) → store byte-identical, NO wipe, day consumed", async () => {
    store.set("nilamind_nila_insights", JSON.stringify([ins({ id: "r1", text: "Keep me." })]));
    const before = store.get("nilamind_nila_insights");
    registerLocalLlmBackend(backendReturning("I'm here with you."));
    await runReflection("digest");
    expect(store.get("nilamind_nila_insights")).toBe(before);
    expect(ls.get("nilamind_last_reflected")).toBe(TODAY);
  });

  it("legitimate empty array [] → NO wipe", async () => {
    store.set("nilamind_nila_insights", JSON.stringify([ins({ id: "r1", text: "Keep me." })]));
    registerLocalLlmBackend(backendReturning("[]"));
    await runReflection("digest");
    expect(loadInsights().map((i) => i.text)).toEqual(["Keep me."]);
  });

  it("transient failure (no model / generation error) → flag NOT set (retries later), store untouched", async () => {
    store.set("nilamind_nila_insights", JSON.stringify([ins({ id: "r1", text: "Keep me." })]));
    registerLocalLlmBackend({ id: "fake", isReady: () => true, generate: async () => { throw new Error("model oom"); } });
    await runReflection("digest");
    expect(ls.get("nilamind_last_reflected")).toBeUndefined();
    expect(loadInsights()).toHaveLength(1);
  });

  it("respects the daily throttle (no model call when already reflected today)", async () => {
    ls.set("nilamind_last_reflected", TODAY);
    const rec = recordingBackend("[]");
    registerLocalLlmBackend(rec.backend);
    await runReflection("digest");
    expect(rec.calls).toHaveLength(0);
  });

  it("payload carries ONLY derived/non-raw data (never raw entry keys)", async () => {
    store.set("nilamind_checkins", JSON.stringify([{ date: TODAY, emotion: "Anxious", intensity: 7, context: "RAW_SECRET" }]));
    const rec = recordingBackend("[]");
    registerLocalLlmBackend(rec.backend);
    await runReflection("Check-ins (30d): 1.");
    const sent = JSON.stringify(rec.calls[0].messages);
    expect(sent).not.toContain("RAW_SECRET"); // runReflection never reads nilamind_checkins
    expect(rec.calls[0].messages[0].content).toContain("Check-ins (30d): 1.");
  });
});

describe("shouldReflectToday", () => {
  beforeEach(() => ls.clear());
  it("true when unset, false after the same local day is recorded", () => {
    expect(shouldReflectToday(TODAY)).toBe(true);
    ls.set("nilamind_last_reflected", TODAY);
    expect(shouldReflectToday(TODAY)).toBe(false);
    expect(shouldReflectToday("2099-01-01")).toBe(true);
  });
});
