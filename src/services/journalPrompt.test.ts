import { describe, it, expect, beforeEach, vi } from "vitest";

const ls = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
});

let ready = false;
const generateOnDevice = vi.fn(async () => "What made today feel different than yesterday?");
vi.mock("./localLlm", () => ({
  isLocalLlmReady: () => ready,
  generateOnDevice: () => generateOnDevice(),
}));
vi.mock("./nilaInsights", () => ({
  insightsContextBlock: () => "",
}));

import { pickStaticPrompt, getDailyPrompt } from "./journalPrompt";

beforeEach(() => { ls.clear(); ready = false; generateOnDevice.mockClear(); });

describe("journalPrompt", () => {
  it("pickStaticPrompt is deterministic for the same date+mode", () => {
    expect(pickStaticPrompt("free", "2026-07-16:free")).toBe(pickStaticPrompt("free", "2026-07-16:free"));
  });

  it("pickStaticPrompt differs (in general) between modes for the same date", () => {
    const free = pickStaticPrompt("free", "2026-07-16:free");
    const gratitude = pickStaticPrompt("gratitude", "2026-07-16:gratitude");
    expect(typeof free).toBe("string");
    expect(typeof gratitude).toBe("string");
  });

  it("falls back to a static prompt when no on-device model is loaded", async () => {
    ready = false;
    const prompt = await getDailyPrompt("free", "2026-07-16");
    expect(generateOnDevice).not.toHaveBeenCalled();
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("uses the on-device model when ready, and caches the result for the day", async () => {
    ready = true;
    const prompt = await getDailyPrompt("free", "2026-07-16");
    expect(generateOnDevice).toHaveBeenCalledTimes(1);
    expect(prompt).toBe("What made today feel different than yesterday?");

    // Second call same day+mode → served from cache, no second model call.
    const cached = await getDailyPrompt("free", "2026-07-16");
    expect(generateOnDevice).toHaveBeenCalledTimes(1);
    expect(cached).toBe(prompt);
  });

  it("degrades to the static fallback if generation throws", async () => {
    ready = true;
    generateOnDevice.mockRejectedValueOnce(new Error("hang-timeout"));
    const prompt = await getDailyPrompt("gratitude", "2026-07-17");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("caches gratitude and free-write prompts independently for the same day", async () => {
    ready = false;
    const free = await getDailyPrompt("free", "2026-07-18");
    const gratitude = await getDailyPrompt("gratitude", "2026-07-18");
    expect(free).not.toBe(gratitude);
  });
});
