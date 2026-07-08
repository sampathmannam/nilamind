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
import { retrievePsychoedForQuery, psychoedContextBlock } from "./psychoedRetrieval";
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

  // Ground the system prompt with RAG top-3 skills for THIS turn (buildNilaSystem(lastUser)) instead of
  // dumping the whole 40-skill library — far fewer prompt tokens to re-prefill, which is the dominant
  // TTFT cost here. (The old "byte-identical prefix for KV reuse" rationale is moot: KV persistence is
  // impossible on this on-device binding, so there is no cross-turn prefix to preserve.) We also append a
  // deterministic mania-elevation steer when the latest message shows it — the elevation guard defends the
  // sycophancy→mania amplification harm: the on-device model can't be trusted to reality-test, so we steer
  // it here and, for the stopping-meds case, append a reliable scripted line below.
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const elevation = detectElevationRisk(lastUser);
  let system = buildNilaSystem(lastUser) + elevationGuardNote(elevation.level);

  // B4: if the user's words match a vetted psychoeducation topic, feed a grounded snippet into the
  // model's awareness (RAG grounding — kills hallucination on clinical facts). Best-effort: if the
  // store/embedder read fails, continue without the block rather than break the chat.
  //
  // NOTE: the model is fed ONE state source — buildNilaSystem() -> buildPersonalContext() (sleep-prodrome,
  // inflection, check-ins, BA — with the careful manic-first §9 framing). A parallel "stateEngine" that
  // re-summarised the SAME signals into a second block was removed (deleted 2026-07-08): it double-fed the
  // model, bloating the prompt on the smaller 1B and risking over-weighting. The warm, safety-framed context
  // stays the single model-facing source.
  try {
    const psychoedSnippet = await retrievePsychoedForQuery(lastUser);
    const psychoedBlock = psychoedContextBlock(psychoedSnippet);
    if (psychoedBlock) system += "\n\n" + psychoedBlock;
  } catch {
    /* psychoed grounding is best-effort, never a hard dependency */
  }

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
