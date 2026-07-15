// On-device companion transport. Mirrors askNilaAgenticStream's return shape so sendToNila can swap
// transports while keeping EVERY §9 gate (crisis input block, live stream guard, output safety gate) —
// the local model plugs in behind those gates, it does NOT re-implement or bypass them.
//
// Local mode is a plain companion: it uses the same Nila persona (buildNilaSystem) but no agentic tools
// or navigation (so navigate/openSkillId are always absent). On any backend failure it returns
// reachedAI:false so the caller shows the offline experience — it never silently falls back to the cloud
// (that would break the user's on-device/privacy choice).

import { buildNilaSystem, explainerQuestionSteer, consecutiveQuestionSteer, registerSteer, type NilaMessage } from "./nila";
import { generateGuarded, isLocalLlmReady } from "./localLlm";
import { detectElevationRisk, elevationGuardNote, elevationOutputNote, energyElevationSignal, napElevationSignal, type ElevationLevel } from "./elevationGuard";
import { emaElevationSignal } from "./ema";
import { suppressNudgesForCrisis } from "./notifications";
import { retrievePsychoedForQuery, psychoedContextBlock } from "./psychoedRetrieval";
import { retrieveExemplarsForQuery, retrieveExemplarsForMove, exemplarFewShotBlock } from "./exemplarRetrieval";
import { resolveMove, type MoveResult } from "./moveEngine";
import { runOutputGuards, hasGenerationBlockingFailure, type GuardResult } from "./outputGuards";
import { offlineFallbackReply } from "./nilaReflect";
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

  // ── Move engine: classify this turn's conversational move ──────────────────────────────
  // Resolves the target reply strategy BEFORE the model runs. The move steer is injected into the
  // system prompt, and move-aware exemplar retrieval filters the few-shot corpus by move type.
  const recentNilaReplies = messages.filter((m) => m.role === "assistant").map((m) => m.content);
  const recentUserMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  const moveResult: MoveResult = resolveMove(lastUser, {
    recentNilaReplies,
    recentUserMessages,
  });

  const textElevation = detectElevationRisk(lastUser);
  // P3.7 — EMA elevation signal: rising valence+energy across today's micro-check-ins.
  // Used as a softer signal alongside text-based detection. If both fire, use the higher level.
  const emaLevel: ElevationLevel = emaElevationSignal();
  // P1.6 — Check-in energy prodrome: sustained rapidly-rising energy across recent days.
  const energyLevel: ElevationLevel = energyElevationSignal();
  // P8.4 — Nap prodrome: frequent / late-long daytime napping as an elevation prodrome.
  const napLevel: ElevationLevel = napElevationSignal();
  const levels: Record<ElevationLevel, number> = { none: 0, elevated: 1, high: 2 };
  const combinedLevel: ElevationLevel =
    levels[textElevation.level] >= levels[emaLevel] &&
    levels[textElevation.level] >= levels[energyLevel] &&
    levels[textElevation.level] >= levels[napLevel]
      ? textElevation.level
      : levels[emaLevel] >= levels[energyLevel] && levels[emaLevel] >= levels[napLevel]
        ? emaLevel
        : levels[energyLevel] >= levels[napLevel]
          ? energyLevel
          : napLevel;
  // P6.4 — when this turn shows elevation, latch the 24h no-nudge window AND yank queued EMA/daily nudges
  // immediately (not just on the next sync). We don't push "how are you right now?" to someone escalating.
  if (combinedLevel !== "none") void suppressNudgesForCrisis();
  let system = buildNilaSystem(lastUser) + elevationGuardNote(combinedLevel);

  // ── Move steer: inject the conversational strategy into the system prompt ──────────────
  // Placed AFTER persona + context (so the model knows WHO it is and WHAT it knows about the user)
  // but BEFORE exemplars and individual steers (so the move frames how it uses the few-shot examples).
  if (moveResult.steer) system += "\n\n" + moveResult.steer;

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

  // Exemplar-RAG (dynamic few-shot): the 1B imitates far better than it obeys. Retrieve the 1-2 nearest
  // gold exchanges for THIS message and inject their replies as on-target demonstrations of length/voice.
  // MOVE-AWARE: filter exemplars by the classified move type first. Fallback to unfiltered retrieval if
  // the move-filtered set is empty (quality over move-matching). Placed LAST (most salient, closest to
  // generation). Fail-open — no match/embedder just drops the block, leaving the persona's static examples.
  try {
    const exemplars = await retrieveExemplarsForMove(lastUser, moveResult.exemplarMoves, 2);
    const block = exemplarFewShotBlock(exemplars);
    if (block) system += "\n\n" + block;
  } catch {
    /* exemplar few-shot is best-effort, never a hard dependency */
  }

  // Per-turn stance steer for "why/how" explainer questions — appended LAST (most salient) so the model
  // reflects instead of lecturing. Exemplar-RAG alone lost to Qwen's lecture default on these (2026-07-12).
  const explainerSteer = explainerQuestionSteer(lastUser);
  if (explainerSteer) system += "\n\n" + explainerSteer;

  // Per-turn register belt (2026-07-13 on-device verification): bare check-ins, should-I decisions, physical
  // panic, grief, and boundary-testing each fell back to Qwen's stock-assistant voice on device — exemplar-RAG
  // alone couldn't steer them (same failure class as the why/how case above). Blunt LAST-position stance,
  // first-match-wins, empty for ordinary venting. Appended after explainerSteer so at most one register/explainer
  // steer dominates the tail; both are narrow enough not to fire on the same message in practice.
  const regSteer = registerSteer(lastUser);
  if (regSteer) system += "\n\n" + regSteer;

  // alliance-voice (2026-07-12 clinical research wave 2): consecutive-question cap. If Nila's own last two
  // replies both ended in "?", steer THIS turn toward reflection only — see the GUARDRAIL comment on
  // consecutiveQuestionSteer in nila.ts before treating this as a reflections:questions ratio (it isn't
  // one; Magill et al. 2018 found the ratio itself isn't outcome-linked).
  const questionCapSteer = consecutiveQuestionSteer(recentNilaReplies);
  if (questionCapSteer) system += "\n\n" + questionCapSteer;

  // ── Generate with output-guard hard-blocks + one-shot regeneration ─────────────────
  // Guard failures are deterministic structural issues (loop, degeneration, scaffold leak,
  // topic drift, circular rambling) — not ambiguous quality preferences. We try once, and
  // if a hard guard fires we regenerate with a targeted anti-pattern reminder. Two strikes
  // then fall back to the offline reflector so the user never sees garbage.
  const generationParams = {
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    onToken: opts.onDelta,
    signal: opts.signal,
  };

  let reply = "";
  let regenAttempts = 0;
  const MAX_REGEN = 1;

  while (regenAttempts <= MAX_REGEN) {
    try {
      const generated = await generateGuarded(generationParams);
      const base = (generated || "").trim();
      const medsNote = elevationOutputNote(combinedLevel);
      const candidate = base && medsNote ? `${base}\n\n${medsNote}` : base;

      if (!candidate) { reply = ""; break; }

      const guardResults = runOutputGuards({
        reply: candidate,
        userMessage: lastUser,
        move: moveResult.move,
        questionAllowed: moveResult.questionAllowed,
        recentReplies: recentNilaReplies.slice(-3),
      });

      if (!hasGenerationBlockingFailure(guardResults)) {
        reply = candidate;
        break;
      }

      // Guard failure on first attempt: inject targeted anti-pattern reminder and retry once.
      // The guard result tells us WHICH guard fired — be surgical, not broad.
      if (regenAttempts < MAX_REGEN) {
        const failedBy = guardResults.filter((r: GuardResult) => !r.pass).map((r: GuardResult) => r.reason).join("; ");
        const antiPatternRemind = `ANTI-PATTERN REMINDER: ${failedBy}. Regenerate with different words and structure. Do not repeat any phrase from your previous reply.`;
        const altSystem = system + "\n\n" + antiPatternRemind;

        const retryGenerated = await generateGuarded({ ...generationParams, system: altSystem });
        const retryBase = (retryGenerated || "").trim();
        const retryCandidate = retryBase && medsNote ? `${retryBase}\n\n${medsNote}` : "";

        if (retryCandidate) {
          const retryResults = runOutputGuards({
            reply: retryCandidate,
            userMessage: lastUser,
            move: moveResult.move,
            questionAllowed: moveResult.questionAllowed,
            recentReplies: recentNilaReplies.slice(-3),
          });
          if (!hasGenerationBlockingFailure(retryResults)) {
            reply = retryCandidate;
            break;
          }
        }
      }

      // Second guard failure (or regen threw) → offline fallback
      reply = "";
      break;
    } catch {
      reply = "";
      break;
    }
    regenAttempts++;
  }

  // Passthrough hydration: if we got "" (e.g. stream interrupted before guard check), fall back
  // to the offline reflector rather than showing an empty reply. But NEVER show a guard-failed
  // reply — the whole point of the gate is that some replies are too broken to show.
  if (!reply) {
    const fallback = offlineFallbackReply(lastUser);
    return { reply: fallback, reachedAI: false };
  }

  return { reply, reachedAI: true };
}
