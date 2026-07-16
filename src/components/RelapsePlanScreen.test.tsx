// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import RelapsePlanScreen from "./RelapsePlanScreen";

afterEach(() => { cleanup(); store.clear(); });

describe("RelapsePlanScreen — Things I can do placeholders", () => {
  it("shows real prompts, not raw object keys like 'selfCare...'", () => {
    const { container } = render(<RelapsePlanScreen />);
    const placeholders = Array.from(container.querySelectorAll("input")).map((el) => el.placeholder);
    expect(placeholders).not.toContain("selfCare...");
    expect(placeholders).not.toContain("copingSkills...");
    expect(placeholders).not.toContain("reachOut...");
    expect(placeholders).not.toContain("crisisHelp...");
    expect(placeholders.some((p) => /self-?care/i.test(p))).toBe(true);
  });
});
