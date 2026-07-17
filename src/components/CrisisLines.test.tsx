// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import CrisisLines from "./CrisisLines";

// A text shortcode must open the SMS composer, not the dialer — a voice call to an SMS
// shortcode (741741 / 85258) fails, and this link sits on the §9 crisis overlay.
vi.mock("../services/crisisResources", () => ({
  getCrisisLines: () => [
    { name: "988 Suicide & Crisis Lifeline", display: "Call or text 988", tel: "988", kind: "call", note: "24/7" },
    { name: "Crisis Text Line", display: "Text HOME to 741741", tel: "741741", kind: "text", note: "24/7" },
    { name: "Find a Helpline", display: "directory", url: "https://findahelpline.com", kind: "directory" },
  ],
}));

afterEach(cleanup);

describe("CrisisLines link kinds", () => {
  it("renders call lines as tel: and text lines as sms:", () => {
    const { container } = render(<CrisisLines />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("tel:988");
    expect(hrefs).toContain("sms:741741");
    expect(hrefs).not.toContain("tel:741741");
  });
});
