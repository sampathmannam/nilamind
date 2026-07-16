// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import PeerSupportScreen from "./PeerSupportScreen";

afterEach(cleanup);

describe("PeerSupportScreen", () => {
  it("renders the header", () => {
    render(<PeerSupportScreen go={() => {}} />);
    expect(screen.getByText(/peer support/i)).toBeTruthy();
  });

  it("renders prewritten templates", () => {
    render(<PeerSupportScreen go={() => {}} />);
    expect(screen.getAllByText(/having a hard time/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/checking in/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/thinking of you/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/quick update/i).length).toBeGreaterThanOrEqual(1);
  });

  it("calls onCopy when a template is tapped", () => {
    const spy = vi.fn();
    render(<PeerSupportScreen go={() => {}} onCopy={spy} />);
    const buttons = screen.getAllByText(/copy/i);
    fireEvent.click(buttons[0]);
    expect(spy).toHaveBeenCalled();
  });

  it("shows session stats when there are sessions", () => {
    render(<PeerSupportScreen go={() => {}} sessions={[{ id: "1", date: "2026-07-16", contactName: "A", moodBefore: 4, moodAfter: 6, connected: true, notes: "" }]} />);
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("session")).toBeTruthy();
  });

  it("shows empty state when no sessions", () => {
    render(<PeerSupportScreen go={() => {}} />);
    expect(screen.getByText(/no sessions yet/i)).toBeTruthy();
  });

  it("renders the back button", () => {
    const go = vi.fn();
    render(<PeerSupportScreen go={go} />);
    fireEvent.click(screen.getByText(/back/i));
    expect(go).toHaveBeenCalledWith("tools");
  });
});
