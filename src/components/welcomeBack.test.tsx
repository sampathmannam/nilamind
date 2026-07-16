// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import WelcomeBackCard, { getWelcomeMessage, daysSinceLastVisit } from "./welcomeBack";

afterEach(cleanup);

describe("WelcomeBackCard", () => {
  it("renders the welcome-back message", () => {
    const lastVisit = new Date();
    lastVisit.setDate(lastVisit.getDate() - 5);
    render(<WelcomeBackCard lastVisitDate={lastVisit.toISOString()} onDismiss={() => {}} />);
    expect(screen.getByText(/welcome back/i)).toBeTruthy();
  });

  it("shows the gap duration", () => {
    const lastVisit = new Date();
    lastVisit.setDate(lastVisit.getDate() - 5);
    render(<WelcomeBackCard lastVisitDate={lastVisit.toISOString()} onDismiss={() => {}} />);
    expect(screen.getByText(/5 days/)).toBeTruthy();
  });

  it("renders nothing for same-day visit", () => {
    const { container } = render(
      <WelcomeBackCard lastVisitDate={new Date().toISOString()} onDismiss={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("getWelcomeMessage", () => {
  it("returns short gap message for 1-2 days", () => {
    expect(getWelcomeMessage(1).toLowerCase()).toContain("good to see you");
  });

  it("returns medium gap message for 3-6 days", () => {
    expect(getWelcomeMessage(4).toLowerCase()).toContain("been a little while");
  });

  it("returns long gap message for 7+ days", () => {
    expect(getWelcomeMessage(10).toLowerCase()).toContain("missed you");
  });

  it("returns very long gap message for 30+ days", () => {
    expect(getWelcomeMessage(45).toLowerCase()).toContain("glad you");
  });
});

describe("daysSinceLastVisit", () => {
  it("returns correct day count", () => {
    const last = new Date();
    last.setDate(last.getDate() - 3);
    expect(daysSinceLastVisit(last.toISOString())).toBeGreaterThanOrEqual(2);
    expect(daysSinceLastVisit(last.toISOString())).toBeLessThanOrEqual(4);
  });
});
