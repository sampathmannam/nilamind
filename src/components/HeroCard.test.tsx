// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("../services/modeEngine", () => ({
  getUserState: vi.fn(),
}));

import HeroCard from "./HeroCard";
import { getUserState } from "../services/modeEngine";

beforeEach(() => {
    (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("calm");
});

afterEach(cleanup);

describe("HeroCard", () => {
  it("renders the 'right now' heading and a single action button", () => {
    render(<HeroCard />);
    expect(screen.getByText("Right now")).toBeTruthy();
    const btn = screen.getByRole("button");
    expect(btn).toBeTruthy();
  });

  it("routes to the breathing view when anxious", () => {
    (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("anxious");
    const onOpenView = vi.fn();
    render(<HeroCard onOpenView={onOpenView} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenView).toHaveBeenCalledWith("breathing");
  });

  it("routes to the checkin view when calm (default)", () => {
  (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("calm");
    const onOpenView = vi.fn();
    render(<HeroCard onOpenView={onOpenView} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenView).toHaveBeenCalledWith("checkin");
  });

  it("routes to the breathing view when elevated", () => {
    (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("elevated");
    const onOpenView = vi.fn();
    render(<HeroCard onOpenView={onOpenView} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenView).toHaveBeenCalledWith("breathing");
  });

  it("routes to the gentle check-in when low", () => {
    (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("low");
    const onOpenView = vi.fn();
    render(<HeroCard onOpenView={onOpenView} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenView).toHaveBeenCalledWith("checkin");
  });
});
