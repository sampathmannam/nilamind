import { describe, it, expect, beforeEach, vi } from "vitest";

// Encrypted-persistence backing mocked as a sync in-memory map (mirrors secureLocal). `store` = "disk": it
// PERSISTS across a simulated app restart (module reload), while the module's `active` state resets.
const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  SENSITIVE_KEYS: [] as string[],
}));

const KEY = "nilamind_protocol_progress";

/** Fresh module instance = a simulated app restart: `active` resets, `store` (disk) survives. */
async function load() {
  vi.resetModules();
  return import("./protocolProgress");
}

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

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
