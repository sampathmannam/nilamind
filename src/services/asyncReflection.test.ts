import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));
vi.mock("./localLlm", () => ({
  isLocalLlmReady: vi.fn(() => true),
  generateOnDevice: vi.fn(async () => "REFLECTION: Today had some hard moments but they showed up.\nINSIGHT: They're carrying work stress and used grounding."),
}));
vi.mock("./crisisClassifier", () => ({
  detectCrisis: vi.fn(async () => false),
}));
vi.mock("./nilaSafetyGate", () => ({
  applyOutputSafety: vi.fn((text: string) => text),
}));
vi.mock("./sessionChat", () => ({
  getSessionChat: vi.fn(() => [
    { role: "user", content: "I had a rough day" },
    { role: "assistant", content: "I'm here" },
    { role: "user", content: "Work was overwhelming" },
  ]),
}));

import { parseReflectionOutput, runAsyncReflection, getLatestReflection } from "./asyncReflection";
import { detectCrisis } from "./crisisClassifier";

describe("parseReflectionOutput", () => {
  it("extracts reflection and insight from valid model output", () => {
    const raw = "REFLECTION: Today had some hard moments but they showed up.\nINSIGHT: Carrying work stress";
    const r = parseReflectionOutput(raw);
    expect(r.text).toContain("hard moments");
    expect(r.insight).toBe("Carrying work stress");
  });

  it("handles 'none' insight gracefully", () => {
    const raw = "REFLECTION: A quiet day today. They seemed steady.\nINSIGHT: none";
    const r = parseReflectionOutput(raw);
    expect(r.insight).toBeNull();
  });

  it("falls back to raw text when no REFLECTION tag", () => {
    const r = parseReflectionOutput("Just a plain response from the model");
    expect(r.text).toBe("Just a plain response from the model");
    expect(r.insight).toBeNull();
  });

  it("handles empty input gracefully", () => {
    const r = parseReflectionOutput("");
    expect(r.text).toBeTruthy();
    expect(r.insight).toBeNull();
  });
});

describe("runAsyncReflection", () => {
  beforeEach(() => { store.clear(); });

  it("returns null when no user turns provided", async () => {
    const r = await runAsyncReflection([]);
    expect(r).toBeNull();
  });

  it("returns null when crisis is detected", async () => {
    (detectCrisis as any).mockResolvedValueOnce(true);
    const r = await runAsyncReflection(["I want to die"]);
    expect(r).toBeNull();
  });

  it("generates and persists a reflection for normal conversation", async () => {
    const r = await runAsyncReflection(["rough day", "work was bad"]);
    expect(r).not.toBeNull();
    expect(r!.text).toContain("hard moments");
    expect(r!.insight).toBeTruthy();

    const saved = store.get("nilamind_async_reflection");
    expect(saved).toBeTruthy();
  });

  it("returns existing reflection if already done today", async () => {
    const existing = { text: "Already reflected", insight: "none", at: Date.now() };
    store.set("nilamind_async_reflection", JSON.stringify(existing));
    const r = await runAsyncReflection(["hello"]);
    expect(r?.text).toBe("Already reflected");
  });
});

describe("getLatestReflection", () => {
  beforeEach(() => { store.clear(); });

  it("returns null when no reflection exists", () => {
    expect(getLatestReflection()).toBeNull();
  });

  it("returns today's reflection", () => {
    store.set("nilamind_async_reflection", JSON.stringify({ text: "hi", insight: null, at: Date.now() }));
    expect(getLatestReflection()?.text).toBe("hi");
  });

  it("returns null for yesterday's reflection", () => {
    const yesterday = Date.now() - 86400_000 * 2;
    store.set("nilamind_async_reflection", JSON.stringify({ text: "old", insight: null, at: yesterday }));
    expect(getLatestReflection()).toBeNull();
  });
});
