// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Clinical research upgrades wave 2 (2026-07-12), Task C — PST fidelity: positive-problem-orientation
// psychoeducation + brainstorm-quantity scaffolding are the specific components that moderate PST efficacy
// (Bell & D'Zurilla, 2009, Clin Psychol Rev), plus if-then implementation intentions + a barrier plan on the
// action plan (Gollwitzer & Sheeran, 2006).

const store: Record<string, string> = {};
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  SENSITIVE_KEYS: [] as string[],
}));

import ProblemSolvingScreen from "./ProblemSolvingScreen";
import { loadSessions } from "../services/problemSolving";

afterEach(cleanup);
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe("ProblemSolvingScreen — PST fidelity (Task C)", () => {
  it("pre-fills the 'define' input from a draft (worry → problem, structured from chat)", () => {
    render(<ProblemSolvingScreen draft={{ problem: "Decide whether to keep the 2-hour commute or move" }} />);
    const input = screen.getByPlaceholderText(/what's the problem/i) as HTMLInputElement;
    expect(input.value).toBe("Decide whether to keep the 2-hour commute or move");
  });

  it("shows positive-problem-orientation psychoeducation on the landing screen", () => {
    render(<ProblemSolvingScreen />);
    // Bell & D'Zurilla (2009): positive problem orientation is a named, efficacy-moderating PST component.
    expect(screen.getByText(/normal part of life|more than one workable solution|most problems have/i)).toBeTruthy();
  });

  it("shows brainstorm-quantity scaffolding once a session is active", () => {
    render(<ProblemSolvingScreen />);
    fireEvent.change(screen.getByPlaceholderText(/what's the problem/i), { target: { value: "Too much on my plate" } });
    fireEvent.click(screen.getByText(/start problem-solving/i));
    expect(screen.getByText(/aim for (at least )?3|quantity first|before judging/i)).toBeTruthy();
  });

  it("captures an if-then implementation intention and a barrier plan alongside the action plan", () => {
    render(<ProblemSolvingScreen />);
    fireEvent.change(screen.getByPlaceholderText(/what's the problem/i), { target: { value: "Too much on my plate" } });
    fireEvent.click(screen.getByText(/start problem-solving/i));

    fireEvent.change(screen.getByPlaceholderText(/add a solution idea/i), { target: { value: "Ask for help" } });
    fireEvent.click(screen.getByLabelText(/add solution/i));
    fireEvent.click(screen.getByText(/choose/i));

    fireEvent.change(screen.getByPlaceholderText(/what steps will you take/i), { target: { value: "Email my manager" } });
    fireEvent.change(screen.getByPlaceholderText(/if.*then i will/i), { target: { value: "If it's Monday morning, then I will email my manager." } });
    fireEvent.change(screen.getByPlaceholderText(/what might get in the way/i), { target: { value: "If I chicken out, I'll ask a friend to check I sent it." } });
    fireEvent.click(screen.getByText(/save action plan/i));

    const sessions = loadSessions();
    expect(sessions[0].implementationIntention).toContain("Monday morning");
    expect(sessions[0].barrierPlan).toContain("chicken out");
  });
});
