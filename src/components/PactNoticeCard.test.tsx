// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import PactNoticeCard from "./PactNoticeCard";
import type { PactNotice } from "../services/pactNotice";

afterEach(cleanup);

const notice: PactNotice = {
  letter: "You've been here before and it passed. You are not alone in this.",
  person: { name: "Sam", contact: "+1 555 123 4567" },
  reason: "your sleep's run short the last 3 nights",
};

describe("PactNoticeCard — pact surfacing wired (audit #30)", () => {
  it("shows the reason, the user's own letter, and a tap-to-text handoff to the named person", () => {
    render(<PactNoticeCard notice={notice} onDismiss={() => {}} />);
    expect(screen.getByText(/sleep's run short/i)).toBeTruthy();
    expect(screen.getByText(/you are not alone in this/i)).toBeTruthy();
    const link = document.getElementById("pact-notice-reach-btn") as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toMatch(/text sam/i);
    // digits-only sms: URI with a prefilled message
    expect(link.getAttribute("href")).toMatch(/^sms:\+15551234567\?body=/);
  });

  it("omits the text button when the trusted person has no contact number", () => {
    render(<PactNoticeCard notice={{ ...notice, person: { name: "Sam" } }} onDismiss={() => {}} />);
    expect(document.getElementById("pact-notice-reach-btn")).toBeNull();
  });

  it("calls onDismiss from the X and when the user acts on the handoff", () => {
    const onDismiss = vi.fn();
    render(<PactNoticeCard notice={notice} onDismiss={onDismiss} />);
    fireEvent.click(document.getElementById("pact-notice-dismiss")!);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent.click(document.getElementById("pact-notice-reach-btn")!);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
