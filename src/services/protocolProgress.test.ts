import { describe, it, expect, beforeEach, vi } from "vitest";

// Encrypted-persistence backing mocked as a sync in-memory map (mirrors secureLocal). `store` = "disk": it
// PERSISTS across a simulated app restart (module reload), while the module's `active` state resets.
const store: Record<string, string> = {};
const baStore: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => {
      if (k.startsWith("nilamind_ba_")) return baStore[k] ?? null;
      return store[k] ?? null;
    },
    setItem: (k: string, v: string) => {
      if (k.startsWith("nilamind_ba_")) baStore[k] = v;
      else store[k] = v;
    },
    removeItem: (k: string) => {
      if (k.startsWith("nilamind_ba_")) delete baStore[k];
      else delete store[k];
    },
  },
  SENSITIVE_KEYS: [] as string[],
}));

const KEY = "nilamind_protocol_progress";
const BA_KEY = "nilamind_ba_activities";

/** Fresh module instance = a simulated app restart: `active` resets, `store` (disk) survives. */
async function load() {
  vi.resetModules();
  return import("./protocolProgress");
}

/** Load behaviouralActivation module with mocked secureLocal. */
async function loadBA() {
  vi.resetModules();
  return import("./behaviouralActivation");
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  for (const k of Object.keys(baStore)) delete baStore[k];
});

describe("protocolProgress — start / advance / complete", () => {
  it("starts a valid protocol at step 0", async () => {
    const m = await load();
    const s = m.startProtocol("behavioral-activation");
    expect(s?.step.id).toBe("ba-1");
    expect(s?.stepIndex).toBe(0);
    expect(s?.total).toBe(5);
  });
  it("returns null for an unknown protocol id (never starts a phantom program)", async () => {
    const m = await load();
    expect(m.startProtocol("does-not-exist")).toBeNull();
    expect(m.getActiveProgress()).toBeNull();
  });
  it("advances step by step, then completes and clears", async () => {
    const m = await load();
    m.startProtocol("behavioral-activation");
    expect(m.advanceProtocol()).toMatchObject({ step: { id: "ba-2" }, stepIndex: 1 });
    m.advanceProtocol(); m.advanceProtocol(); // ba-3, ba-4
    expect(m.advanceProtocol()).toMatchObject({ step: { id: "ba-5" } }); // last step
    expect(m.advanceProtocol()).toMatchObject({ done: true }); // past the end → done
    expect(m.getActiveProgress()).toBeNull(); // cleared on completion
  });
  it("getActiveProgress reflects the current step", async () => {
    const m = await load();
    m.startProtocol("worry-postponement");
    m.advanceProtocol();
    expect(m.getActiveProgress()?.step.id).toBe("wp-2");
  });
  it("abandon clears the active program", async () => {
    const m = await load();
    m.startProtocol("behavioral-activation");
    m.abandonProtocol();
    expect(m.getActiveProgress()).toBeNull();
  });
});

describe("protocolProgress — encrypted persistence across app restart", () => {
  it("resumes an in-progress program on a fresh app start", async () => {
    const first = await load();
    first.startProtocol("behavioral-activation");
    first.advanceProtocol(); first.advanceProtocol(); // now at ba-3 (index 2)

    const afterRestart = await load(); // module reloads; store (disk) persists
    expect(afterRestart.getActiveProgress()?.step.id).toBe("ba-3");
    expect(afterRestart.getActiveProgress()?.stepIndex).toBe(2);
  });
  it("a corrupt/stale stored blob never wedges — starts clean", async () => {
    store[KEY] = "{not json";
    const m = await load();
    expect(m.getActiveProgress()).toBeNull();
  });
  it("a persisted-but-now-invalid protocol id clears itself", async () => {
    store[KEY] = JSON.stringify({ protocolId: "removed-protocol", stepIndex: 0 });
    const m = await load();
    expect(m.getActiveProgress()).toBeNull();
  });
});

describe("protocolOffer — offer only when nothing active + a concern matches", () => {
  it("offers a matched protocol when nothing is active", async () => {
    const m = await load();
    expect(m.protocolOffer("i can't stop worrying about everything")?.id).toBe("worry-postponement");
  });
  it("does NOT offer while a program is active (never interrupt one with another)", async () => {
    const m = await load();
    m.startProtocol("behavioral-activation");
    expect(m.protocolOffer("i can't stop worrying")).toBeNull();
  });
  it("does NOT offer on a benign message", async () => {
    const m = await load();
    expect(m.protocolOffer("thanks, that really helped")).toBeNull();
  });
});

describe("BA protocol integration — BA engine wired to protocol steps", () => {
  it("BA protocol advances through all 5 steps correctly", async () => {
    const m = await load();
    const first = m.startProtocol("behavioral-activation");
    expect(first?.step.id).toBe("ba-1"); // psychoed
    expect(first?.step.kind).toBe("psychoed");

    let r = m.advanceProtocol();
    expect(r && "step" in r ? r.step.id : undefined).toBe("ba-2"); // reflect
    r = m.advanceProtocol();
    expect(r && "step" in r ? r.step.id : undefined).toBe("ba-3"); // plan
    r = m.advanceProtocol();
    expect(r && "step" in r ? r.step.id : undefined).toBe("ba-4"); // exercise
    r = m.advanceProtocol();
    expect(r && "step" in r ? r.step.id : undefined).toBe("ba-5"); // reflect
    const done = m.advanceProtocol();
    expect(done).toMatchObject({ done: true });
    if (done && "protocol" in done) expect(done.protocol.title).toBe("Behavioral Activation");
  });

  it("BA plan step (ba-3) has kind=plan and exercise step (ba-4) has kind=exercise", async () => {
    const m = await load();
    m.startProtocol("behavioral-activation");
    m.advanceProtocol(); // ba-1 -> ba-2
    m.advanceProtocol(); // ba-2 -> ba-3 (plan)
    const planStep = m.getActiveProgress();
    expect(planStep?.step.kind).toBe("plan");
    expect(planStep?.step.title).toBe("Pick something small");

    m.advanceProtocol(); // ba-3 -> ba-4 (exercise)
    const exStep = m.getActiveProgress();
    expect(exStep?.step.kind).toBe("exercise");
    expect(exStep?.step.title).toBe("Schedule it");
  });
});

describe("BA engine — activity logging and insight", () => {
  async function makeBA() {
    vi.resetModules();
    for (const k of Object.keys(baStore)) delete baStore[k];
    return import("./behaviouralActivation");
  }

  it("logs a planned activity and later marks it done with mastery/pleasure", async () => {
    const m = await makeBA();
    const now = "2026-01-15";

    // Plan an activity (status: planned)
    m.upsertActivity({
      id: "a1",
      date: now,
      timestamp: "10:00",
      title: "Walk outside",
      category: "movement",
      status: "planned",
    });

    // Complete it with ratings
    m.upsertActivity({
      id: "a1",
      date: now,
      timestamp: "10:00",
      title: "Walk outside",
      category: "movement",
      status: "done",
      mastery: 7,
      pleasure: 6,
    });

    const loaded = m.loadActivities();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].status).toBe("done");
    expect(loaded[0].mastery).toBe(7);
    expect(loaded[0].pleasure).toBe(6);
  });

  it("computes insight from rated activities", async () => {
    const m = await makeBA();
    const now = "2026-01-15";

    m.upsertActivity({ id: "a1", date: now, timestamp: "10:00", title: "Walk", category: "movement", status: "done", mastery: 7, pleasure: 6 });
    m.upsertActivity({ id: "a2", date: now, timestamp: "10:00", title: "Text", category: "connection", status: "done", mastery: 5, pleasure: 8 });
    m.upsertActivity({ id: "a3", date: now, timestamp: "10:00", title: "Make bed", category: "mastery", status: "done", mastery: 8, pleasure: 4 });

    const insight = m.computeInsight();
    expect(insight.done).toBe(3);
    expect(insight.avgMastery).toBeCloseTo(6.67, 1);
    expect(insight.avgPleasure).toBeCloseTo(6, 1);
    expect(insight.topCategory).not.toBeNull();
    expect(insight.topCategory?.id).toBe("movement"); // (7+6)=13 vs (5+8)=13 vs (8+4)=12 — tie but movement first in list
  });

  it("ignores unrated activities for averages", async () => {
    const m = await makeBA();
    const now = "2026-01-15";

    m.upsertActivity({ id: "a1", date: now, timestamp: "10:00", title: "Rated", category: "movement", status: "done", mastery: 8, pleasure: 8 });
    m.upsertActivity({ id: "a2", date: now, timestamp: "10:00", title: "Unrated", category: "movement", status: "done" }); // no ratings

    const insight = m.computeInsight();
    expect(insight.done).toBe(2);
    expect(insight.avgMastery).toBe(8);
    expect(insight.avgPleasure).toBe(8);
  });
});
