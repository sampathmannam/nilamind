import { secureLocal, appendToSecureArray } from "./secureLocal";

const ADHERENCE_KEY = "nilamind_protocol_adherence";

export interface StepRecord {
  stepId: string;
  stepIndex: number;
  startedAt: string;
  completedAt?: string;
}

export interface ProtocolAdherenceSession {
  protocolId: string;
  startTime: string;
  endTime?: string;
  stepRecords: StepRecord[];
  status: "active" | "completed" | "abandoned";
}

export interface ProtocolAdherenceEntry {
  protocolId: string;
  title: string;
  started: number;
  completed: number;
  abandoned: number;
  avgStepsCompleted: number;
}

export interface ProtocolAdherenceSummary {
  totalStarted: number;
  totalCompleted: number;
  totalAbandoned: number;
  adherenceRate: number;
  perProtocol: ProtocolAdherenceEntry[];
}

function readAll(): ProtocolAdherenceSession[] {
  try {
    const raw = secureLocal.getItem(ADHERENCE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: ProtocolAdherenceSession[]): void {
  try {
    secureLocal.setItem(ADHERENCE_KEY, JSON.stringify(sessions));
  } catch {
    /* best-effort */
  }
}

export function recordStepStart(
  protocolId: string,
  stepId: string,
  stepIndex: number,
): ProtocolAdherenceSession | null {
  const sessions = readAll();
  let session = sessions.find((s) => s.status === "active");

  if (!session) {
    session = {
      protocolId,
      startTime: new Date().toISOString(),
      stepRecords: [],
      status: "active",
    };
    sessions.push(session);
  }

  const existing = session.stepRecords.find((s) => s.stepId === stepId);
  if (!existing) {
    session.stepRecords.push({ stepId, stepIndex, startedAt: new Date().toISOString() });
  }

  writeAll(sessions);
  return session;
}

export function recordStepComplete(
  protocolId: string,
  stepId: string,
): ProtocolAdherenceSession | null {
  const sessions = readAll();
  const session = sessions.find((s) => s.status === "active" && s.protocolId === protocolId);
  if (!session) return null;

  const step = session.stepRecords.find((s) => s.stepId === stepId);
  if (!step) return null;

  if (!step.completedAt) {
    step.completedAt = new Date().toISOString();
  }

  writeAll(sessions);
  return session;
}

export function recordProtocolAbandon(
  protocolId: string,
): ProtocolAdherenceSession | null {
  const sessions = readAll();
  const session = sessions.find((s) => s.status === "active" && s.protocolId === protocolId);
  if (!session) return null;

  session.status = "abandoned";
  session.endTime = new Date().toISOString();

  writeAll(sessions);
  return session;
}

export function markProtocolComplete(
  protocolId: string,
): ProtocolAdherenceSession | null {
  const sessions = readAll();
  const session = sessions.find((s) => s.status === "active" && s.protocolId === protocolId);
  if (!session) return null;

  session.status = "completed";
  session.endTime = new Date().toISOString();

  writeAll(sessions);
  return session;
}

export function getActiveSession(): ProtocolAdherenceSession | null {
  const sessions = readAll();
  return sessions.find((s) => s.status === "active") ?? null;
}

const PROTOCOL_TITLES: Record<string, string> = {
  "behavioral-activation": "Behavioral Activation",
  "worry-postponement": "Worry Postponement",
  "self-compassion": "Self-Compassion",
  "sleep-wind-down": "Sleep Wind-Down",
  "social-confidence": "Social Confidence",
  "panic-skills": "Panic Skills",
  "cooling-anger": "Cooling Anger",
  "grounding-anchor": "Grounding & Anchor",
  "sleep-rhythm": "Sleep Rhythm",
  "social-connection": "Social Connection",
  "gratitude": "Gratitude Practice",
  "values-action": "Values-Based Action",
  "dbt-skills-training": "DBT Skills Training",
  "act-training": "ACT Skills Training",
  "assertion-training": "Assertion Training",
  "cbti-sleep": "Sleep Better (CBT-I)",
};

function protocolTitle(id: string): string {
  return PROTOCOL_TITLES[id] ?? id;
}

export function getAdherenceSummary(): ProtocolAdherenceSummary {
  const sessions = readAll();
  const finished = sessions.filter((s) => s.status !== "active");

  const totalStarted = finished.length;
  const totalCompleted = finished.filter((s) => s.status === "completed").length;
  const totalAbandoned = finished.filter((s) => s.status === "abandoned").length;
  const adherenceRate = totalStarted > 0 ? totalCompleted / totalStarted : 0;

  const byProtocol = new Map<string, { started: number; completed: number; abandoned: number; totalSteps: number }>();
  for (const s of finished) {
    const entry = byProtocol.get(s.protocolId) ?? { started: 0, completed: 0, abandoned: 0, totalSteps: 0 };
    entry.started++;
    if (s.status === "completed") entry.completed++;
    if (s.status === "abandoned") entry.abandoned++;
    entry.totalSteps += s.stepRecords.length;
    byProtocol.set(s.protocolId, entry);
  }

  const perProtocol: ProtocolAdherenceEntry[] = Array.from(byProtocol.entries()).map(
    ([protocolId, stats]) => ({
      protocolId,
      title: protocolTitle(protocolId),
      started: stats.started,
      completed: stats.completed,
      abandoned: stats.abandoned,
      avgStepsCompleted: stats.started > 0 ? Math.round((stats.totalSteps / stats.started) * 10) / 10 : 0,
    }),
  );

  return { totalStarted, totalCompleted, totalAbandoned, adherenceRate, perProtocol };
}
