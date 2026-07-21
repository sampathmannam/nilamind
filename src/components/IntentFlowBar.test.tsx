import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import IntentFlowBar, { suggestPhase } from "./IntentFlowBar";

// @vitest-environment jsdom
// Reset document before each test
afterEach(() => {
  document.body.innerHTML = "";
});

describe("IntentFlowBar", () => {
  it("renders all three phase labels", () => {
    const onChange = vi.fn();
    render(<IntentFlowBar currentPhase="data" onPhaseChange={onChange} />);
    expect(screen.getByText("Calm")).toBeTruthy();
    expect(screen.getByText("Data")).toBeTruthy();
    expect(screen.getByText("Protocol")).toBeTruthy();
  });

  it("marks current phase as active", () => {
    const onChange = vi.fn();
    render(<IntentFlowBar currentPhase="data" onPhaseChange={onChange} />);
    const dataButton = screen.getByRole("button", { name: /Data/i });
    expect(dataButton.getAttribute("aria-current")).toBe("step");
  });

  it("calls onPhaseChange on click", () => {
    const onChange = vi.fn();
    render(<IntentFlowBar currentPhase="data" onPhaseChange={onChange} />);
    const calmBtn = screen.getByRole("button", { name: /Calm/i });
    fireEvent.click(calmBtn);
    expect(onChange).toHaveBeenCalledWith("calm");
  });

  it("does not mark non-current phases as active", () => {
    const onChange = vi.fn();
    render(<IntentFlowBar currentPhase="data" onPhaseChange={onChange} />);
    const calmBtn = screen.getByRole("button", { name: /Calm/i });
    expect(calmBtn.getAttribute("aria-current")).toBeNull();
  });
});

describe("suggestPhase", () => {
  it("returns calm for anxious state", () => {
    expect(suggestPhase("anxious")).toBe("calm");
  });

  it("returns calm for crisis state", () => {
    expect(suggestPhase("crisis")).toBe("calm");
  });

  it("returns data for low state", () => {
    expect(suggestPhase("low")).toBe("data");
  });

  it("returns data for morning time when no state", () => {
    expect(suggestPhase(null, "morning")).toBe("data");
  });

  it("returns calm for night when no state", () => {
    expect(suggestPhase(null, "night")).toBe("calm");
  });

  it("returns data as default when no signals", () => {
    expect(suggestPhase(null)).toBe("data");
  });

  it("state overrides time", () => {
    expect(suggestPhase("calm", "night")).toBe("calm");
  });
});