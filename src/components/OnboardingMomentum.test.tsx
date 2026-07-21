import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import OnboardingMomentum from "./OnboardingMomentum";

// @vitest-environment jsdom

afterEach(() => {
  cleanup();
});

describe("OnboardingMomentum", () => {
  it("renders goal step initially", () => {
    render(<OnboardingMomentum />);
    expect(screen.getByPlaceholderText(/Reduce anxiety, improve sleep/)).toBeTruthy();
  });

  it("button is disabled when goal is empty", () => {
    render(<OnboardingMomentum />);
    const button = screen.getByRole("button", { name: /Begin Journey/ });
    expect(button).toHaveProperty("disabled", true);
  });

  it("enables button after entering goal", () => {
    render(<OnboardingMomentum />);
    fireEvent.change(screen.getByPlaceholderText(/Reduce anxiety, improve sleep/), {
      target: { value: "Test goal" },
    });
    expect(screen.getByRole("button", { name: /Begin Journey/ })).toHaveProperty("disabled", false);
  });

  it("transitions to journal step on button click", () => {
    render(<OnboardingMomentum />);
    fireEvent.change(screen.getByPlaceholderText(/Reduce anxiety, improve sleep/), {
      target: { value: "Test goal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Begin Journey/ }));
    expect(screen.getByText(/How did you feel today/)).toBeTruthy();
  });

  it("shows insight after journal entry", () => {
    render(<OnboardingMomentum />);
    fireEvent.change(screen.getByPlaceholderText(/Reduce anxiety, improve sleep/), {
      target: { value: "Test goal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Begin Journey/ }));
    fireEvent.change(screen.getByPlaceholderText(/Describe your mood/), {
      target: { value: "I felt anxious and want to feel calm" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Get Insight/ }));
    expect(screen.getByText(/Your mood pattern reveals/)).toBeTruthy();
  });

  it("calls onComplete on finishing", () => {
    const onComplete = vi.fn();
    render(<OnboardingMomentum onComplete={onComplete} />);
    fireEvent.change(screen.getByPlaceholderText(/Reduce anxiety, improve sleep/), {
      target: { value: "Test goal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Begin Journey/ }));
    fireEvent.change(screen.getByPlaceholderText(/Describe your mood/), {
      target: { value: "I felt anxious" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Get Insight/ }));
    fireEvent.click(screen.getByRole("button", { name: /Start Your Daily Journey/ }));
    expect(onComplete).toHaveBeenCalled();
  });
});
