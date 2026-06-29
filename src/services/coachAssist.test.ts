import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// coachAssist runs fully ON-DEVICE now (generateOnDevice). We register a fake LocalLlmBackend (the real
// seam) so we can prove (a) crisis text NEVER reaches the model and (b) an unsafe model reply is gated.
import { fetchBalancedThought, analyzeQuickNote, runDeepAssessment } from "./coachAssist";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";
import { getCrisisReply, getUnsafeFallbackReply } from "../safety";

// crisisResources.ts touches localStorage at module scope — stub it for node.
beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

// Records each generate() call so a crisis test can assert the model was NEVER reached.
function recordingBackend(reply: string, ready = true) {
  const calls: { system: string; messages: { role: string; content: string }[] }[] = [];
  const backend: LocalLlmBackend = {
    id: "fake", isReady: () => ready,
    generate: async ({ system, messages }) => { calls.push({ system, messages }); return reply; },
  };
  return { backend, calls };
}

beforeEach(() => registerLocalLlmBackend(null));

// ─────────────────────────────────────────────────────────────────────────────
// §9 — these three entry points crisis-scan the user's free text BEFORE any model call: on a crisis
// hit they return { crisis: true } and NEVER reach the on-device model, so the crisis decision never
// depends on the model (mirrors nilaSafetyInvariants §9 invariant 1).
// ─────────────────────────────────────────────────────────────────────────────
describe("coachAssist §9 gate — crisis short-circuits before the model runs", () => {
  let calls: ReturnType<typeof recordingBackend>["calls"];
  beforeEach(() => {
    const rec = recordingBackend("should never be generated");
    calls = rec.calls;
    registerLocalLlmBackend(rec.backend);
  });

  it("fetchBalancedThought blocks on crisis in the situation field, model never called", async () => {
    const r = await fetchBalancedThought({
      situation: "I want to die after that argument",
      feeling: "shame",
      automaticThought: "everyone hates me",
      beliefPercent: 80,
      selectedTraps: [],
    });
    expect(r.crisis).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("fetchBalancedThought also scans the feeling field (not just what's templated)", async () => {
    const r = await fetchBalancedThought({
      situation: "an argument",
      feeling: "I just want to end my life",
      automaticThought: "it's pointless",
      beliefPercent: 50,
      selectedTraps: [],
    });
    expect(r.crisis).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("analyzeQuickNote blocks on crisis text, model never called", async () => {
    const r = await analyzeQuickNote("no reason to live anymore");
    expect(r.crisis).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("runDeepAssessment blocks when a stored free-text field carries crisis content, model never called", async () => {
    const r = await runDeepAssessment({
      checkins: [],
      diaryEntries: [{ date: "2026-06-20", quickNotes: "I can't go on like this" }],
      episodes: [],
    });
    expect(r.crisis).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 — the scan must survive whitespace/serialization variance (newlines, field joins).
// ─────────────────────────────────────────────────────────────────────────────
describe("coachAssist §9 — scan catches whitespace/boundary variants", () => {
  let calls: ReturnType<typeof recordingBackend>["calls"];
  beforeEach(() => {
    const rec = recordingBackend("should never be generated");
    calls = rec.calls;
    registerLocalLlmBackend(rec.backend);
  });

  it("fetchBalancedThought catches a crisis phrase broken by a newline in a field", async () => {
    const r = await fetchBalancedThought({
      situation: "we had a fight",
      feeling: "hopeless",
      automaticThought: "honestly I want to\ndie",
      beliefPercent: 50,
      selectedTraps: [],
    });
    expect(r.crisis).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("analyzeQuickNote catches a crisis phrase broken by a newline", async () => {
    const r = await analyzeQuickNote("there's no reason\nto live anymore");
    expect(r.crisis).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("runDeepAssessment catches crisis text containing a newline in a stored field", async () => {
    const r = await runDeepAssessment({
      checkins: [],
      diaryEntries: [{ date: "2026-06-20", quickNotes: "i can't\ngo on" }],
      episodes: [],
    });
    expect(r.crisis).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 — output gate: an UNSAFE model reply must be replaced by the safe fallback before the screen
// shows it (same checkResponse gate sendToNila runs). The reframe prompt invites distortion-adjacent
// output (Rule 3), so this path especially needs it.
// ─────────────────────────────────────────────────────────────────────────────
describe("coachAssist §9 — output gate replaces unsafe model replies", () => {
  it("fetchBalancedThought replaces a distortion-validating reply with the safe fallback", async () => {
    registerLocalLlmBackend(recordingBackend("you're worthless and that's just the truth").backend);
    const r = await fetchBalancedThought({
      situation: "an argument with a friend",
      feeling: "frustrated",
      automaticThought: "they think I'm annoying",
      beliefPercent: 60,
      selectedTraps: [],
    });
    expect(r.crisis).toBe(false);
    if (r.crisis === false) expect(r.reply).toBe(getUnsafeFallbackReply());
  });

  it("analyzeQuickNote replaces an unsafe analysis with the safe fallback", async () => {
    registerLocalLlmBackend(recordingBackend("you are a failure").backend);
    const r = await analyzeQuickNote("a calm note about my day");
    expect(r.crisis).toBe(false);
    if (r.crisis === false) expect(r.analysis).toBe(getUnsafeFallbackReply());
  });

  it("runDeepAssessment replaces an unsafe insight reply with the safe fallback", async () => {
    registerLocalLlmBackend(recordingBackend("it's hopeless").backend);
    const r = await runDeepAssessment({
      checkins: [{ date: "2026-06-20", distress: 3 }],
      diaryEntries: [],
      episodes: [],
    });
    expect(r.crisis).toBe(false);
    if (r.crisis === false) expect(r.reply).toBe(getUnsafeFallbackReply());
  });
});

describe("coachAssist — benign inputs reach the on-device model and return results", () => {
  it("fetchBalancedThought generates on-device and returns the reply", async () => {
    const rec = recordingBackend("A gentler view: …");
    registerLocalLlmBackend(rec.backend);
    const r = await fetchBalancedThought({
      situation: "an argument with a friend",
      feeling: "frustrated",
      automaticThought: "they think I'm annoying",
      beliefPercent: 60,
      selectedTraps: ["Mind-Reading"],
    });
    expect(r.crisis).toBe(false);
    expect(rec.calls).toHaveLength(1);
    if (r.crisis === false) expect(r.reply).toBe("A gentler view: …");
  });

  it("analyzeQuickNote generates on-device and returns the analysis (tags are gone with the cloud step → [])", async () => {
    const rec = recordingBackend("You handled that well.");
    registerLocalLlmBackend(rec.backend);
    const r = await analyzeQuickNote("Felt annoyed before my meeting, then practiced breathing.");
    expect(r.crisis).toBe(false);
    expect(rec.calls).toHaveLength(1);
    if (r.crisis === false) {
      expect(r.analysis).toBe("You handled that well.");
      expect(r.tags).toEqual([]);
    }
  });

  it("runDeepAssessment sends the serialized logs to the model and returns the reply", async () => {
    const rec = recordingBackend("3 insights: …");
    registerLocalLlmBackend(rec.backend);
    const r = await runDeepAssessment({
      checkins: [{ date: "2026-06-20", distress: 4 }],
      diaryEntries: [{ date: "2026-06-20", quickNotes: "a calm productive day" }],
      episodes: [],
    });
    expect(r.crisis).toBe(false);
    expect(rec.calls).toHaveLength(1);
    // the logs are serialized into the user message handed to the model
    expect(JSON.stringify(rec.calls[0].messages)).toContain("a calm productive day");
    if (r.crisis === false) expect(r.reply).toBe("3 insights: …");
  });

  it("throws a clear error when no on-device model is loaded (screen shows it)", async () => {
    registerLocalLlmBackend(null);
    await expect(analyzeQuickNote("a calm note")).rejects.toThrow(/on-device model isn't ready/);
  });
});

// The deterministic crisis copy the screens render on a { crisis: true } result is the shared
// getCrisisReply() — assert it's non-empty so screens have a real surface to show.
describe("coachAssist — crisis surface source", () => {
  it("getCrisisReply is the shared deterministic copy (non-empty)", () => {
    expect(getCrisisReply().length).toBeGreaterThan(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 REGRESSION GUARD — no screen may call /api/claude directly. Every model call from a component
// must route through a §9-gated service (coachAssist here, or sendToNila for the chat). A raw fetch in
// a component is exactly the bypass that left ThoughtRecord/DiaryCard/Dashboard ungated; this guard
// fails if any component reintroduces one. (Now that Nila is on-device there is no cloud endpoint at
// all, so this must stay at zero.)
// ─────────────────────────────────────────────────────────────────────────────
describe("§9 regression guard — no component calls /api/claude directly", () => {
  const HERE = dirname(fileURLToPath(import.meta.url)); // .../src/services
  const COMPONENTS = resolve(HERE, "..", "components"); // .../src/components

  it("zero component files reference an /api/claude endpoint (any fetch shape — var, template literal, etc.)", () => {
    const offenders: string[] = [];
    for (const name of readdirSync(COMPONENTS)) {
      if (!/\.(ts|tsx)$/.test(name)) continue;
      const text = readFileSync(join(COMPONENTS, name), "utf8");
      if (/\/api\/claude\//.test(text)) offenders.push(name);
    }
    expect(offenders, `components referencing /api/claude directly (must use a §9-gated service):\n${offenders.join("\n")}`).toEqual([]);
  });
});
