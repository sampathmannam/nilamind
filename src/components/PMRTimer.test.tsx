// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import PMRTimer from "./PMRTimer";

afterEach(cleanup);

describe("PMRTimer", () => {
  it("renders the first muscle group's label and tense cue before starting", () => {
    render(<PMRTimer />);
    expect(screen.getByText("Hands & forearms")).toBeTruthy();
    expect(screen.getByText(/tight fists/i)).toBeTruthy();
  });

  it("shows a play control and no pause control before starting", () => {
    render(<PMRTimer />);
    expect(screen.getByLabelText("Play")).toBeTruthy();
    expect(screen.queryByLabelText("Pause")).toBeNull();
  });

  it("shows a group counter (1 of 6) before starting", () => {
    render(<PMRTimer />);
    expect(screen.getByText(/1 of 6/)).toBeTruthy();
  });

  it("does not show the completion cue before finishing", () => {
    render(<PMRTimer />);
    expect(screen.queryByText(/all done|complete/i)).toBeNull();
  });
});
