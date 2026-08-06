// @vitest-environment jsdom
// Redesign acceptance #3 (docs/superpowers/specs/2026-08-06-less-is-more-redesign-design.md):
// the crisis Help pill is present on every tab. Shipped on all 4 tabs in v1.20.10, regressed when
// Tools/You were rebuilt for the 4-tab IA. Nila's pill lives in NilaHeader (rendered by ModeScreen);
// this file pins the three tab screens that render it directly, so a screen rewrite that drops the
// pill fails here instead of on-device.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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
vi.mock("../hooks/useHaptics", () => ({ hapticMedium: vi.fn(), hapticLight: vi.fn() }));
vi.mock("../hooks/useUserContext", () => ({ useUserContext: () => ({ timeMode: "day", state: null }) }));
vi.mock("../services/chatSuggestions", () => ({ getUserGoals: () => [] }));

import TodayScreen from "./TodayScreen";
import ToolsScreen from "./ToolsScreen";
import YouScreen from "./YouScreen";

const HELP_NAME = /get help now/i;
const noop = () => {};

afterEach(() => { cleanup(); store.clear(); });

describe("crisis pill presence (all-4-tabs invariant)", () => {
  it("TodayScreen renders the Help pill", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByRole("button", { name: HELP_NAME })).toBeTruthy();
  });

  it("ToolsScreen renders the Help pill", () => {
    render(<ToolsScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByRole("button", { name: HELP_NAME })).toBeTruthy();
  });

  it("YouScreen renders the Help pill", () => {
    render(<YouScreen go={noop} onOpenCrisis={noop} />);
    expect(screen.getByRole("button", { name: HELP_NAME })).toBeTruthy();
  });
});
