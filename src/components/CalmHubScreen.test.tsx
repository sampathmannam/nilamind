// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { t } from "../services/i18n";

const recordToolUse = vi.fn();
vi.mock("../services/recentTools", () => ({
  recordToolUse: (id: string) => recordToolUse(id),
}));

import CalmHubScreen from "./CalmHubScreen";

afterEach(() => { cleanup(); recordToolUse.mockClear(); });

describe("CalmHubScreen — launcher", () => {
  it("lists the three calm destinations", () => {
    render(<CalmHubScreen go={() => {}} />);
    expect(screen.getByText("Breathing & Grounding")).toBeTruthy();
    expect(screen.getByText(t("tool_winddown_label"))).toBeTruthy();
    expect(screen.getByText("Ambient sounds")).toBeTruthy();
  });

  it("routes and records on tap", () => {
    const go = vi.fn();
    render(<CalmHubScreen go={go} />);
    fireEvent.click(screen.getByText("Breathing & Grounding"));
    expect(recordToolUse).toHaveBeenCalledWith("plan");
    expect(go).toHaveBeenCalledWith("plan");
    fireEvent.click(screen.getByText("Ambient sounds"));
    expect(recordToolUse).toHaveBeenCalledWith("sounds");
    expect(go).toHaveBeenCalledWith("sounds");
  });
});
