// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import CaptureSheets, { type CaptureSheetsProps, type AuxCaptureView } from "./CaptureSheets";

// Stub the five capture screens — this unit test is about the REGISTRY (which sheet renders, and that closing
// clears exactly that sheet's draft), not the screens themselves. Real <Sheet> is kept so role/title/close
// are exercised.
vi.mock("./LearnScreen", () => ({ default: () => <div data-testid="learn-stub" /> }));
vi.mock("./ThoughtRecordScreen", () => ({ default: () => <div data-testid="thought-stub" /> }));
vi.mock("./ProblemSolvingScreen", () => ({ default: () => <div data-testid="problem-stub" /> }));
vi.mock("./ValuesToActionScreen", () => ({ default: () => <div data-testid="values-stub" /> }));
vi.mock("./SafetyPlanScreen", () => ({ default: () => <div data-testid="safety-stub" /> }));

function makeProps(over: Partial<CaptureSheetsProps> = {}): CaptureSheetsProps {
  return {
    auxView: null,
    valuesHighlight: [],
    onClose: vi.fn(),
    clearThoughtRecordDraft: vi.fn(),
    clearProblemDraft: vi.fn(),
    clearValuesHighlight: vi.fn(),
    clearSafetyPlanDraft: vi.fn(),
    ...over,
  };
}

const CASES: { view: AuxCaptureView; title: string; testid: string }[] = [
  { view: "learn", title: "Learn", testid: "learn-stub" },
  { view: "thought_record", title: "Thought Record", testid: "thought-stub" },
  { view: "problem_solving", title: "Problem-Solving", testid: "problem-stub" },
  { view: "values_to_action", title: "Do one thing", testid: "values-stub" },
  { view: "safety_plan", title: "My Safety Plan", testid: "safety-stub" },
];

afterEach(cleanup);

describe("CaptureSheets registry", () => {
  it("renders nothing when auxView is null", () => {
    const { container } = render(<CaptureSheets {...makeProps()} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  for (const c of CASES) {
    it(`${c.view} → "${c.title}" sheet wrapping its screen`, () => {
      render(<CaptureSheets {...makeProps({ auxView: c.view })} />);
      expect(screen.getByRole("dialog", { name: c.title })).toBeTruthy();
      expect(screen.getByTestId(c.testid)).toBeTruthy();
    });
  }

  it("closing thought_record clears ONLY the thought-record draft (no desync)", () => {
    const p = makeProps({ auxView: "thought_record" });
    render(<CaptureSheets {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(p.clearThoughtRecordDraft).toHaveBeenCalledTimes(1);
    expect(p.clearProblemDraft).not.toHaveBeenCalled();
    expect(p.clearValuesHighlight).not.toHaveBeenCalled();
    expect(p.clearSafetyPlanDraft).not.toHaveBeenCalled();
  });

  it("closing values_to_action clears ONLY the values highlight", () => {
    const p = makeProps({ auxView: "values_to_action" });
    render(<CaptureSheets {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(p.clearValuesHighlight).toHaveBeenCalledTimes(1);
    expect(p.clearThoughtRecordDraft).not.toHaveBeenCalled();
    expect(p.clearProblemDraft).not.toHaveBeenCalled();
    expect(p.clearSafetyPlanDraft).not.toHaveBeenCalled();
  });

  it("closing learn clears no draft (no-op clearDraft), still calls onClose", () => {
    const p = makeProps({ auxView: "learn" });
    render(<CaptureSheets {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(p.clearThoughtRecordDraft).not.toHaveBeenCalled();
    expect(p.clearProblemDraft).not.toHaveBeenCalled();
    expect(p.clearValuesHighlight).not.toHaveBeenCalled();
    expect(p.clearSafetyPlanDraft).not.toHaveBeenCalled();
  });
});
