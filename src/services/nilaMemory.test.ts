import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

vi.mock("./localLlm", () => ({
  generateOnDevice: vi.fn(async () => null),
}));

vi.mock("../safety", () => ({
  checkResponse: vi.fn(() => true),
}));

vi.mock("./storageUtils", () => ({
  localDateKey: () => "2026-08-03",
}));

import { loadNilaMemories, recentMemoryLines, rememberSession } from "./nilaMemory";

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe("loadNilaMemories", () => {
  it("returns an array", () => {
    const result = loadNilaMemories();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array when no memories stored", () => {
    expect(loadNilaMemories()).toEqual([]);
  });

  it("returns stored memories", () => {
    const memories = [{ date: "2026-08-01", note: "They felt anxious" }];
    store["nilamind_nila_memory"] = JSON.stringify(memories);
    expect(loadNilaMemories()).toEqual(memories);
  });

  it("filters out malformed entries", () => {
    store["nilamind_nila_memory"] = JSON.stringify([
      { date: "2026-08-01", note: "valid" },
      { note: "missing date" },
      { date: "2026-08-02" },
      "not an object",
    ]);
    const result = loadNilaMemories();
    expect(result).toHaveLength(1);
    expect(result[0].note).toBe("valid");
  });
});

describe("recentMemoryLines", () => {
  it("returns empty string when no memories", () => {
    expect(recentMemoryLines()).toBe("");
  });

  it("returns formatted string of recent memories", () => {
    store["nilamind_nila_memory"] = JSON.stringify([
      { date: "2026-08-01", note: "They felt anxious" },
      { date: "2026-08-02", note: "They were feeling better" },
    ]);
    const result = recentMemoryLines(2);
    expect(result).toContain("They felt anxious");
    expect(result).toContain("They were feeling better");
    expect(result.startsWith("- ")).toBe(true);
  });

  it("limits to n most recent memories", () => {
    store["nilamind_nila_memory"] = JSON.stringify([
      { date: "2026-07-30", note: "old" },
      { date: "2026-08-01", note: "recent1" },
      { date: "2026-08-02", note: "recent2" },
    ]);
    const result = recentMemoryLines(2);
    expect(result).not.toContain("old");
    expect(result).toContain("recent1");
    expect(result).toContain("recent2");
  });
});

describe("rememberSession", () => {
  it("is a function", () => {
    expect(typeof rememberSession).toBe("function");
  });

  it("returns a promise", () => {
    const result = rememberSession([]);
    expect(result).toBeInstanceOf(Promise);
  });
});
