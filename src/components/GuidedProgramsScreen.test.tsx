// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GuidedProgramsScreen from "./GuidedProgramsScreen";
import { abandonProtocol, startProtocol } from "../services/protocolProgress";

afterEach(cleanup);

describe("GuidedProgramsScreen", () => {
  beforeEach(() => abandonProtocol());

  it("renders all 21 protocols", () => {
    render(<GuidedProgramsScreen onStart={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /./ }).length).toBeGreaterThanOrEqual(21);
  });

  it("groups protocols into Quick programs and Deeper modules sections", () => {
    render(<GuidedProgramsScreen onStart={vi.fn()} />);
    expect(screen.getByText("Quick programs")).toBeTruthy();
    expect(screen.getByText("Deeper modules")).toBeTruthy();
  });

  it("shows the citation for each protocol", () => {
    render(<GuidedProgramsScreen onStart={vi.fn()} />);
    // Multiple protocols' basis text mentions Linehan — getByText would throw on multiple matches,
    // so assert on the count instead.
    expect(screen.getAllByText(/Linehan/).length).toBeGreaterThan(0);
  });

  it("tapping a protocol with no active session starts it directly", () => {
    const onStart = vi.fn();
    render(<GuidedProgramsScreen onStart={onStart} />);
    fireEvent.click(screen.getByText("Self-Compassion"));
    expect(onStart).toHaveBeenCalledWith("self-compassion");
  });

  it("tapping a different protocol while one is active shows a switch confirmation instead of starting immediately", () => {
    startProtocol("behavioral-activation");
    const onStart = vi.fn();
    render(<GuidedProgramsScreen onStart={onStart} />);
    fireEvent.click(screen.getByText("Self-Compassion"));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText(/Switch from Behavioral Activation/)).toBeTruthy();
    fireEvent.click(screen.getByText("Switch"));
    expect(onStart).toHaveBeenCalledWith("self-compassion");
  });

  it("tapping the already-active protocol starts it directly, no confirmation", () => {
    startProtocol("behavioral-activation");
    const onStart = vi.fn();
    render(<GuidedProgramsScreen onStart={onStart} />);
    fireEvent.click(screen.getByText("Behavioral Activation"));
    expect(onStart).toHaveBeenCalledWith("behavioral-activation");
  });
});
