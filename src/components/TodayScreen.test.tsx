// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/secureLocal")>();
  return {
    ...actual,
    secureLocal: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
});
vi.mock("../hooks/useHaptics", () => ({ hapticMedium: vi.fn() }));

import TodayScreen, { getRecommendedAction } from "./TodayScreen";

afterEach(() => { cleanup(); store.clear(); });

describe("getRecommendedAction", () => {
  it("returns intention prompt in morning (6-11)", () => {
    const action = getRecommendedAction(8);
    expect(action.title).toBe("Set your intention for today");
    expect(action.route).toBe("plan");
  });

  it("returns grounding in afternoon (12-16)", () => {
    const action = getRecommendedAction(14);
    expect(action.title).toBe("Take a grounding break");
    expect(action.route).toBe("plan");
  });

  it("returns wind-down in evening (17-21)", () => {
    const action = getRecommendedAction(20);
    expect(action.title).toBe("Wind Down");
    expect(action.route).toBe("winddown");
  });

  it("returns rest well at night (22-5)", () => {
    const action = getRecommendedAction(23);
    expect(action.title).toBe("Rest well");
    expect(action.route).toBe("winddown");
  });
});

describe("TodayScreen — calm home", () => {
  const noop = () => {};
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-08-05T10:00:00")); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders greeting", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByRole("heading", { name: /Good/ })).toBeTruthy();
  });

  it("renders mood buttons", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByText("How are you feeling?")).toBeTruthy();
    expect(screen.getByLabelText(/calm/i)).toBeTruthy();
    expect(screen.getByLabelText(/good/i)).toBeTruthy();
    expect(screen.getByLabelText(/okay/i)).toBeTruthy();
    expect(screen.getByLabelText(/anxious/i)).toBeTruthy();
    expect(screen.getByLabelText(/overwhelmed/i)).toBeTruthy();
  });

  it("renders recommended action", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByText("Set your intention for today")).toBeTruthy();
  });

  it("mood button navigates to ema_checkin", () => {
    const go = vi.fn();
    render(<TodayScreen go={go} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByLabelText(/calm/i));
    expect(go).toHaveBeenCalledWith("ema_checkin");
  });

  it("renders crisis support button", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByRole("button", { name: /get help now/i })).toBeTruthy();
  });

  it("settings gear navigates to settings", () => {
    const go = vi.fn();
    render(<TodayScreen go={go} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    expect(go).toHaveBeenCalledWith("settings");
  });

  it("recommended action navigates to correct route", () => {
    const go = vi.fn();
    render(<TodayScreen go={go} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByText("Set your intention for today").closest("button")!);
    expect(go).toHaveBeenCalledWith("plan");
  });

  it("shows evening wind-down action at night", () => {
    vi.setSystemTime(new Date("2026-08-05T20:00:00"));
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByText("Wind Down")).toBeTruthy();
  });

  it("shows grounding action in afternoon", () => {
    vi.setSystemTime(new Date("2026-08-05T14:00:00"));
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByText("Take a grounding break")).toBeTruthy();
  });

  it("re-using a Recently tool refreshes its recency and navigates", () => {
    const oldTs = Date.now() - 3600_000;
    store.set("nilamind_recent_tools", JSON.stringify([{ target: "winddown", timestamp: oldTs }]));
    const go = vi.fn();
    render(<TodayScreen go={go} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByText("Wind Down"));
    expect(go).toHaveBeenCalledWith("winddown");
    const saved = JSON.parse(store.get("nilamind_recent_tools")!) as { target: string; timestamp: number }[];
    expect(saved[0].target).toBe("winddown");
    expect(saved[0].timestamp).toBeGreaterThan(oldTs); // recordToolUse refreshed it
  });
});
