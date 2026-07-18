// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import PassiveInsightCard from "./PassiveInsightCard";

describe("PassiveInsightCard", () => {
  afterEach(() => cleanup());
  const defaultProps = {
    id: "test-card",
    type: "activity_shift",
    title: "Activity pattern shift",
    body: "Reduced sleep combined with increased phone activity.",
    icon: "activity",
    color: "amber",
  };

  it("renders title and body", () => {
    render(<PassiveInsightCard {...defaultProps} />);
    expect(screen.getByText("Activity pattern shift")).toBeTruthy();
    expect(screen.getByText("Reduced sleep combined with increased phone activity.")).toBeTruthy();
  });

  it("renders action button when provided", () => {
    const onAction = vi.fn();
    render(
      <PassiveInsightCard
        {...defaultProps}
        actionLabel="Check in"
        onAction={onAction}
      />
    );
    const btn = screen.getByText("Check in");
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalled();
  });

  it("renders dismiss button when provided", () => {
    const onDismiss = vi.fn();
    render(<PassiveInsightCard {...defaultProps} onDismiss={onDismiss} />);
    const btn = screen.getByText("Not now");
    fireEvent.click(btn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it("returns null when title is empty", () => {
    const { container } = render(
      <PassiveInsightCard {...defaultProps} title="" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when body is empty", () => {
    const { container } = render(
      <PassiveInsightCard {...defaultProps} body="" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("has data-testid attribute", () => {
    render(<PassiveInsightCard {...defaultProps} />);
    expect(screen.getByTestId("passive-insight-card-test-card")).toBeTruthy();
  });
});
