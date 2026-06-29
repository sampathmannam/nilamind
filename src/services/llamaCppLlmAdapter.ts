// llama-cpp-capacitor LocalLlmBackend adapter — the NATIVE/on-phone transport for Nila's V2 4B brain.
//
// Replaces the @capgo/capacitor-llm (MediaPipe .task, flat "User:/Nila:" string) path with llama.cpp +
// a real GGUF, so Nila's brain is the therapy-tuned Gemma-3-4B QLoRA (V2). Two things this buys us that
// the MediaPipe path could not:
//   1. The model's REAL Gemma-3 chat template (messages[] -> native jinja) instead of a flat roleless
//      transcript — the exact format V2 was validated under (fixes the silent role-confusion risk).
//   2. A persistent llama context whose KV cache the runtime reuses across turns (the TTFT lever).
//
// Measured on the Motorola XT2603 (SM8845, ARMv9.2, 8 fast cores): decode ~16 tok/s, prefill ~50 tok/s
// at fa=0 (flash-attn HURTS prefill here: 50->24). CPU-only — @cantoo/llama GPU offload is iOS-only.
//
// Native-only (cannot run in web/node/test); register it from main.tsx behind isNativePlatform() once
// the model is loaded. It plugs in behind the unchanged §9 gates (crisis input block, live stream guard,
// output safety gate) — it does NOT re-implement or bypass them; the caller keeps them around onToken.
import { initLlama, type LlamaContext } from "llama-cpp-capacitor";
import type { LocalLlmBackend, LocalGenParams } from "./localLlm";
// Prompt construction lives in gemmaPrompt.ts (pure, unit-tested, no native import). We pass a raw
// prompt STRING (not messages[]) to dodge the binding's crashing jinja path — see that file for why.
import { toGemmaPrompt, windowMessages } from "./gemmaPrompt";

// Side-loaded GGUF in the app's own external files dir (adb push, mirrors the capgo .task path). The
// PRODUCTION path is downloadModel() on first run — deferred; side-load validates the end-to-end brain.
const DEFAULT_MODEL_PATH =
  "/sdcard/Android/data/com.nilamind.app/files/v2-4b-Q4_K_M.gguf";

export function createLlamaCppBackend(
  modelPath: string = DEFAULT_MODEL_PATH,
  label = "nila-v2-4b-q4km",
): LocalLlmBackend {
  let ctx: LlamaContext | null = null;
  let ready = false;
  let warmedSystem = ""; // skip redundant warms of an unchanged system prefix
  // The native context allows only ONE completion at a time, so warm() and generate() must never
  // overlap on it (else they collide -> the generate throws -> the caller shows the calm "model not
  // ready" fallback). `warmPromise` tracks an in-flight warm; `generating` tracks an in-flight real
  // reply. generate() stops+awaits any warm before starting AND sets `generating` so a pre-warm
  // retry-tick (AiCoachScreen fires warm() every 2s, independent of the UI loading gate) can't start a
  // colliding warm mid-generation. Real generates can't overlap each other — the chat UI is loading-gated.
  let warmPromise: Promise<void> | null = null;
  let generating = false;

  // Load the GGUF on creation (mirrors the capgo adapter's readiness probe). isReady() stays false until
  // the context is up; a load failure just leaves it false -> the gate keeps Nila on the calm offline
  // path (no model = no reply, never a network).
  void (async () => {
    try {
      ctx = await initLlama({
        model: modelPath,
        n_ctx: 4096,
        n_threads: 8, // SM8845: 2 prime + 6 perf, no efficiency cores -> use all 8
        n_gpu_layers: 0, // CPU-only on Android (GPU offload is iOS-only in this binding)
        flash_attn: false, // measured: fa hurts prefill on this CPU (50->24 tok/s)
      });
      ready = true;
    } catch (e) {
      console.warn("[llamaCpp] model load failed:", e);
    }
  })();

  return {
    id: `gemma3-4b-llamacpp/${label}`,
    isReady: () => ready && !!ctx,

    // Prefill the system prompt into the KV cache so the first real message reuses it (the native
    // common_part() prefix-reuse). n_predict:1 -> we just want the prefill, not generation.
    warm: async (system: string): Promise<void> => {
      if (!ctx || warmPromise || generating || system === warmedSystem) return;
      const c = ctx;
      warmPromise = (async () => {
        try {
          await c.completion({ prompt: toGemmaPrompt(system, []), n_predict: 1, temperature: 0 });
          warmedSystem = system;
        } catch {
          /* warm is best-effort: a failure just means the first message pays the full prefill */
        } finally {
          warmPromise = null;
        }
      })();
      return warmPromise;
    },

    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      if (!ctx) throw new Error("llama-cpp context not ready");
      generating = true; // claim the context so warm() bails for the whole turn (reset in finally below)
      // Yield the context: stop any in-flight best-effort pre-warm so this real message runs now (its
      // partial prefill is still reused via common_part). Without this they collide on the single context.
      if (warmPromise) {
        try { await ctx.stopCompletion(); } catch { /* ignore */ }
        try { await warmPromise; } catch { /* ignore */ }
      }
      const prompt = toGemmaPrompt(system, windowMessages(messages)); // cap history to fit n_ctx
      let full = "";
      let aborted = false;
      const onAbort = () => {
        aborted = true;
        void ctx?.stopCompletion();
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      try {
        const res = await ctx.completion(
          {
            prompt,
            n_predict: 220, // cap reply length (decode is the per-token cost on CPU)
            // Low temp tracks the validated greedy behaviour (briefer, more in-distribution) — the model
            // was fine-tuned for ~50-word replies; high temp drifts longer + slower to decode.
            temperature: 0.4,
            top_k: 40,
            top_p: 0.95,
            // Stop on the Gemma turn boundaries so Nila never runs into a fabricated next turn.
            stop: ["<end_of_turn>", "<start_of_turn>"],
          },
          // On Android this binding does NOT emit per-token events (completionNative returns the full
          // result), so this callback never fires and `full` stays empty — see the non-streaming fallback
          // below. On platforms that DO stream (dev/desktop) it forwards each token live.
          (data) => {
            if (aborted) return;
            full += data.token;
            onToken(data.token);
          },
        );
        if (aborted) throw new Error("aborted");
        // Defensive: the binding may ignore `stop` natively, so cut anything from the first Gemma turn
        // marker onward (a fabricated next turn) before it can be spoken or rendered.
        let text = (res?.text || full).trim();
        const cut = text.search(/<(?:end|start)_of_turn>/);
        if (cut !== -1) text = text.slice(0, cut).trim();
        // No tokens streamed on-device (full empty) -> the streamed consumers (the voice-call speech
        // queue, the live §9 stream guard, the progressive bubble render) never ran. Feed the finished
        // reply through onToken ONCE so they all work: voice speaks it, the live guard scans it, it
        // renders. Without this, a successful reply is silent in CallNilaScreen.
        if (!full && text) onToken(text);
        return text;
      } finally {
        generating = false;
        signal?.removeEventListener("abort", onAbort);
      }
    },
  };
}
