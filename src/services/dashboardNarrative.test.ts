// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/localLlm", () => ({
  isLocalLlmReady: vi.fn(),
  generateOnDevice: vi.fn(),
}));
vi.mock("../services/nilaSafetyGate", () => ({
  applyOutputSafety: vi.fn((reply: string) => reply),
}));

import { generateDashboardNarrative, __clearNarrativeCache } from "./dashboardNarrative";
import { isLocalLlmReady, generateOnDevice } from "../services/localLlm";
import { applyOutputSafety } from "../services/nilaSafetyGate";

const input = {
  activityMessage: "You've shown up 4 days running.",
  monthlyWord: "steady",
  behaviourCount: 1,
  proactiveCount: 0,
  moodSummary: "This week felt calmer than last.",
  signalCount: 2,
  episodeCount: 0,
  sessionCount: 3,
  lang: "en" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  __clearNarrativeCache();
  (applyOutputSafety as unknown as ReturnType<typeof vi.fn>).mockImplementation((r: string) => r);
});

describe("generateDashboardNarrative", () => {
  it("returns the static fallback when the model is not ready", async () => {
    (isLocalLlmReady as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const out = await generateDashboardNarrative(input);
    expect(out).toBe("This week felt calmer than last.");
    expect(generateOnDevice).not.toHaveBeenCalled();
  });

  it("upgrades to the model text when ready and safe", async () => {
    (isLocalLlmReady as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (generateOnDevice as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("A steady week with a gentle upward drift — keep the small wins close.");
    const out = await generateDashboardNarrative(input);
    expect(out).toContain("steady week");
    expect(applyOutputSafety).toHaveBeenCalled();
  });

  it("falls back to the static gist if the model returns nothing", async () => {
    (isLocalLlmReady as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (generateOnDevice as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const out = await generateDashboardNarrative(input);
    expect(out).toBe("This week felt calmer than last.");
  });

  it("rejects unsafe/over-long model output and falls back", async () => {
    (isLocalLlmReady as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (generateOnDevice as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("x".repeat(200));
    (applyOutputSafety as unknown as ReturnType<typeof vi.fn>).mockImplementation((r: string) => r);
    const out = await generateDashboardNarrative(input);
    expect(out).toBe("This week felt calmer than last.");
  });

  it("reuses a cached safe upgrade instead of re-invoking the model on repeat mounts", async () => {
    (isLocalLlmReady as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const fresh = { ...input, moodSummary: "A unique week worth caching separately." };
    (generateOnDevice as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("A calm, steady week — gentle wins count.");
    await generateDashboardNarrative(fresh);
    await generateDashboardNarrative(fresh);
    // Second mount within the TTL must serve the cache, not call the model again.
    expect(generateOnDevice).toHaveBeenCalledTimes(1);
  });

  it("skips the model entirely for non-English locales", async () => {
    (isLocalLlmReady as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const out = await generateDashboardNarrative({ ...input, lang: "hi" });
    expect(generateOnDevice).not.toHaveBeenCalled();
    expect(out).toBe(input.moodSummary);
  });
});
