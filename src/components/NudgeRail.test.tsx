// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import NudgeRail, { type NudgeRailProps } from "./NudgeRail";

afterEach(cleanup);

function props(over: Partial<NudgeRailProps> = {}): NudgeRailProps {
  return {
    visibleNudgeIds: new Set<string>(),
    safetyPlanCard: null,
    calmSafetyNudge: null,
    sleepProdromeNudge: null,
    jitaiNudge: null,
    onOpenSafetyPlan: vi.fn(),
    onCompleteReview: vi.fn(),
    onCompleteFollowUp: vi.fn(),
    onDismissCalm: vi.fn(),
    onDismissSleep: vi.fn(),
    onOpenWindDown: vi.fn(),
    onQuickAction: vi.fn(),
    ...over,
  };
}

const jitai = (over: Record<string, unknown> = {}) =>
  ({ shouldNudge: true, nudgeText: "a gentle nudge", suggestedTool: "winddown", ...over }) as any;

describe("NudgeRail", () => {
  it("renders nothing when nothing is visible", () => {
    const { container } = render(<NudgeRail {...props()} />);
    expect(container.querySelector("[id$='-card']")).toBeNull();
  });

  it("safety-plan review card wires both buttons", () => {
    const p = props({ visibleNudgeIds: new Set(["safetyPlan"]), safetyPlanCard: "review" });
    const { container } = render(<NudgeRail {...p} />);
    expect(container.querySelector("#safety-plan-review-card")).not.toBeNull();
    fireEvent.click(screen.getByText("Review plan"));
    fireEvent.click(screen.getByText("Looks good"));
    expect(p.onOpenSafetyPlan).toHaveBeenCalledTimes(1);
    expect(p.onCompleteReview).toHaveBeenCalledTimes(1);
    expect(p.onCompleteFollowUp).not.toHaveBeenCalled();
  });

  it("safety-plan follow-up card fires onCompleteFollowUp", () => {
    const p = props({ visibleNudgeIds: new Set(["safetyPlan"]), safetyPlanCard: "followup" });
    const { container } = render(<NudgeRail {...p} />);
    expect(container.querySelector("#safety-plan-followup-card")).not.toBeNull();
    fireEvent.click(screen.getByText("Done"));
    expect(p.onCompleteFollowUp).toHaveBeenCalledTimes(1);
  });

  it("calm card renders label + dismisses (double-guarded on calmSafetyNudge.show)", () => {
    const p = props({
      visibleNudgeIds: new Set(["safetyPlan"]),
      safetyPlanCard: "calm",
      calmSafetyNudge: { show: true, label: "One blank left in your plan" },
    });
    const { container } = render(<NudgeRail {...p} />);
    expect(container.querySelector("#calm-safety-plan-nudge-card")).not.toBeNull();
    expect(screen.getByText("One blank left in your plan")).toBeTruthy();
    fireEvent.click(screen.getByText("Not now"));
    expect(p.onDismissCalm).toHaveBeenCalledTimes(1);
  });

  it("calm card stays hidden when calmSafetyNudge.show is false (double-guard)", () => {
    const p = props({
      visibleNudgeIds: new Set(["safetyPlan"]),
      safetyPlanCard: "calm",
      calmSafetyNudge: { show: false, label: "x" },
    });
    const { container } = render(<NudgeRail {...p} />);
    expect(container.querySelector("#calm-safety-plan-nudge-card")).toBeNull();
  });

  it("sleep card: Wind down + Not now wire the right callbacks", () => {
    const p = props({
      visibleNudgeIds: new Set(["sleep"]),
      sleepProdromeNudge: { firing: true, detail: "3 short nights" },
    });
    const { container } = render(<NudgeRail {...p} />);
    expect(container.querySelector("#sleep-prodrome-card")).not.toBeNull();
    expect(screen.getByText("3 short nights")).toBeTruthy();
    fireEvent.click(screen.getByText("Wind down"));
    fireEvent.click(screen.getByText("Not now"));
    expect(p.onOpenWindDown).toHaveBeenCalledTimes(1);
    expect(p.onDismissSleep).toHaveBeenCalledTimes(1);
  });

  it("JITAI card maps a known tool to its resolved quick-action id", () => {
    const p = props({ visibleNudgeIds: new Set(["jitai"]), jitaiNudge: jitai({ suggestedTool: "winddown" }) });
    const { container } = render(<NudgeRail {...p} />);
    expect(container.querySelector("#jitai-nudge-card")).not.toBeNull();
    fireEvent.click(screen.getByText("Try wind down"));
    expect(p.onQuickAction).toHaveBeenCalledWith("wind_down");
  });

  it("JITAI unknown tool: renders raw-id label, click is a no-op", () => {
    const p = props({ visibleNudgeIds: new Set(["jitai"]), jitaiNudge: jitai({ suggestedTool: "mystery_tool" }) });
    render(<NudgeRail {...p} />);
    fireEvent.click(screen.getByText("Try mystery_tool"));
    expect(p.onQuickAction).not.toHaveBeenCalled();
  });

  it("respects the upstream cap: a safety-plan card not in visibleNudgeIds is hidden", () => {
    const p = props({ visibleNudgeIds: new Set<string>(), safetyPlanCard: "review" });
    const { container } = render(<NudgeRail {...p} />);
    expect(container.querySelector("#safety-plan-review-card")).toBeNull();
  });
});
