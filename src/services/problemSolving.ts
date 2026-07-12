import { secureLocal } from "./secureLocal";

const PST_KEY = "nilamind_problem_solving";

export type PSTStep = "define" | "brainstorm" | "evaluate" | "plan" | "review";

export interface Solution {
  id: string;
  text: string;
  pros: string[];
  cons: string[];
  chosen: boolean;
}

export interface ProblemSession {
  id: string;
  createdAt: string;
  step: PSTStep;
  problem: string;
  solutions: Solution[];
  actionPlan: string[];
  // If-then implementation intention + a barrier plan, per Gollwitzer & Sheeran (2006), Adv Exp Soc Psychol
  // (d=0.65 general goal attainment, d+=0.99 in mental-health samples) — the cheapest evidence-backed win
  // available wherever the app asks someone to plan an action. Optional: never fabricated if unset.
  implementationIntention?: string;
  barrierPlan?: string;
  completed: boolean;
  solved: boolean;
  learning: string;
}

let _pstCounter = 0;

export function createSession(problem: string): ProblemSession {
  _pstCounter++;
  return {
    id: "pst_" + Date.now() + "_" + _pstCounter,
    createdAt: new Date().toISOString(),
    step: "define",
    problem,
    solutions: [],
    actionPlan: [],
    completed: false,
    solved: false,
    learning: "",
  };
}

export function addSolution(session: ProblemSession, text: string): ProblemSession {
  return {
    ...session,
    solutions: [...session.solutions, { id: "sol_" + Date.now(), text, pros: [], cons: [], chosen: false }],
  };
}

export function setProsCons(session: ProblemSession, solutionId: string, pros: string[], cons: string[]): ProblemSession {
  return {
    ...session,
    solutions: session.solutions.map((s) => (s.id === solutionId ? { ...s, pros, cons } : s)),
  };
}

export function chooseSolution(session: ProblemSession, solutionId: string): ProblemSession {
  return {
    ...session,
    solutions: session.solutions.map((s) => ({ ...s, chosen: s.id === solutionId })),
  };
}

export function setActionPlan(
  session: ProblemSession,
  steps: string[],
  opts?: { implementationIntention?: string; barrierPlan?: string },
): ProblemSession {
  return {
    ...session,
    actionPlan: steps,
    step: "plan",
    ...(opts?.implementationIntention ? { implementationIntention: opts.implementationIntention } : {}),
    ...(opts?.barrierPlan ? { barrierPlan: opts.barrierPlan } : {}),
  };
}

export function completeSession(session: ProblemSession, solved: boolean, learning: string): ProblemSession {
  return { ...session, completed: true, solved, learning, step: "review" };
}

export function loadSessions(): ProblemSession[] {
  try {
    const raw = secureLocal.getItem(PST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: ProblemSession): void {
  const sessions = loadSessions().filter((s) => s.id !== session.id);
  sessions.push(session);
  secureLocal.setItem(PST_KEY, JSON.stringify(sessions));
}

export function activeSessions(): ProblemSession[] {
  return loadSessions().filter((s) => !s.completed);
}

export function solveRate(sessions: ProblemSession[]): number {
  const completed = sessions.filter((s) => s.completed);
  if (completed.length === 0) return 0;
  return Math.round((completed.filter((s) => s.solved).length / completed.length) * 100);
}
