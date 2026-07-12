// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import ExposureHierarchyScreen from "./ExposureHierarchyScreen";
import { inhibitoryLearningPrompts } from "../services/exposureHierarchy";

afterEach(() => { cleanup(); store.clear(); });

describe("ExposureHierarchyScreen — inhibitory-learning prompts wired into completion flow", () => {
  it("shows the inhibitoryLearningPrompts() reflection questions when completing a step (previously dead code)", () => {
    render(<ExposureHierarchyScreen />);

    // Create a hierarchy
    fireEvent.change(screen.getByPlaceholderText(/hierarchy name/i), { target: { value: "Social anxiety" } });
    fireEvent.click(document.querySelector("#exposure-screen button")!);

    // Add a step
    fireEvent.change(screen.getByPlaceholderText(/exposure step/i), { target: { value: "Make a phone call to a stranger" } });
    fireEvent.click(screen.getByText("Add step"));

    // Enter the completion flow
    fireEvent.click(screen.getByText("Complete"));

    // The previously-unused inhibitoryLearningPrompts() should now render as guided reflection prompts.
    const prompts = inhibitoryLearningPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    for (const prompt of prompts) {
      expect(screen.getByText(prompt)).toBeTruthy();
    }
  });

  it("cites Craske, Treanor, Conway, Zbozinek & Vervliet (2014) near the reflection prompts", () => {
    render(<ExposureHierarchyScreen />);
    fireEvent.change(screen.getByPlaceholderText(/hierarchy name/i), { target: { value: "Heights" } });
    fireEvent.click(document.querySelector("#exposure-screen button")!);
    fireEvent.change(screen.getByPlaceholderText(/exposure step/i), { target: { value: "Look at a photo of a tall building" } });
    fireEvent.click(screen.getByText("Add step"));
    fireEvent.click(screen.getByText("Complete"));

    expect(screen.getByText(/Craske, Treanor, Conway, Zbozinek/i)).toBeTruthy();
    expect(screen.getByText(/2014/)).toBeTruthy();
  });
});
