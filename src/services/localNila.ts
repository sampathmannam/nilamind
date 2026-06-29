// On-device companion transport. Mirrors askNilaAgenticStream's return shape so sendToNila can swap
// transports while keeping EVERY §9 gate (crisis input block, live stream guard, output safety gate) —
// the local model plugs in behind those gates, it does NOT re-implement or bypass them.
//
// Local mode is a plain companion: it uses the same Nila persona (buildNilaSystem) but no agentic tools
// or navigation (so navigate/openSkillId are always absent). On any backend failure it returns
// reachedAI:false so the caller shows the offline experience — it never silently falls back to the cloud
// (that would break the user's on-device/privacy choice).

import { buildNilaSystem, type NilaMessage } from "./nila";
import { generateGuarded, isLocalLlmReady } from "./localLlm";
import { detectElevationRisk, elevationGuardNote, elevationOutputNote } from "./elevationGuard";
import type { AgentView } from "./agent";

export interface LocalNilaResult {
  reply: string;
  reachedAI: boolean;
  navigate?: AgentView; // always undefined — local mode has no tools (kept for shape-compat with the cloud result)
  openSkillId?: string; // always undefined
}

export async function askNilaLocalStream(
  messages: NilaMessage[],
  opts: { onDelta: (t: string) => void; signal?: AbortSignal }
): Promise<LocalNilaResult> {
  if (!isLocalLlmReady()) return { reply: "", reachedAI: false };

  // STABLE system prompt (no per-query RAG) so the prefix is byte-identical across turns for the native
  // KV prefix-reuse — EXCEPT we append a deterministic mania-elevation steer when the latest message shows
  // it (a rare, safety-warranted re-prefill). The elevation guard defends the sycophancy→mania
  // amplification harm: the on-device model can't be trusted to reality-test, so we steer it here and, for
  // the stopping-meds case, append a reliable scripted line below — rather than hope the model behaves.
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const elevation = detectElevationRisk(lastUser);
  const system = buildNilaSystem() + elevationGuardNote(elevation.level);

  try {
    // generateGuarded races a hang-timeout (Gate 6) so a true native deadlock still falls back to the
    // calm offline path instead of hanging forever — shared by every on-device caller (see localLlm.ts).
    const reply = await generateGuarded({
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      onToken: opts.onDelta,
      signal: opts.signal,
    });
    const base = (reply || "").trim();
    const medsNote = elevationOutputNote(elevation.level); // reliable scripted belt for the stopping-meds case
    return { reply: base && medsNote ? `${base}\n\n${medsNote}` : base, reachedAI: true };
  } catch {
    // Device tried and failed (OOM, load error, cancel, hang-timeout). Stay local → offline; never cloud.
    return { reply: "", reachedAI: false };
  }
}
