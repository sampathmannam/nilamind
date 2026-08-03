import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import { loadEpisodes } from "./episodes";
import type { EpisodeRecord } from "../types";

const makeEpisode = (overrides: Partial<EpisodeRecord> = {}): EpisodeRecord => ({
  id: "ep1",
  date: "2026-07-10",
  time: "14:30",
  dayOfWeek: "Thursday",
  timeOfDay: "afternoon",
  trigger: "work stress",
  skillsHelpful: ["deep breathing"],
  startIntensity: 5,
  peakIntensity: 7,
  endIntensity: 3,
  durationMinutes: 45,
  humanContactPrompted: false,
  crisisLineShown: false,
  ...overrides,
});

beforeEach(() => { store = {}; });

describe("loadEpisodes", () => {
  it("returns an array", () => {
    const episodes = loadEpisodes();
    expect(Array.isArray(episodes)).toBe(true);
  });

  it("returns [] when storage is empty", () => {
    expect(loadEpisodes()).toEqual([]);
  });

  it("returns saved episodes from storage", () => {
    const ep = makeEpisode();
    store["nilamind_episodes"] = JSON.stringify([ep]);
    const episodes = loadEpisodes();
    expect(episodes).toHaveLength(1);
    expect(episodes[0].id).toBe("ep1");
  });

  it("returns [] on corrupt (non-array) data", () => {
    store["nilamind_episodes"] = "not-json{{{";
    expect(loadEpisodes()).toEqual([]);
  });

  it("returns [] on non-array JSON", () => {
    store["nilamind_episodes"] = JSON.stringify({ not: "an array" });
    expect(loadEpisodes()).toEqual([]);
  });

  it("handles multiple episodes", () => {
    const ep1 = makeEpisode({ id: "ep1" });
    const ep2 = makeEpisode({ id: "ep2" });
    store["nilamind_episodes"] = JSON.stringify([ep1, ep2]);
    expect(loadEpisodes()).toHaveLength(2);
  });
});
