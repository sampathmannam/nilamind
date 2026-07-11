// llama-cpp-capacitor LocalLlmBackend adapter — the NATIVE/on-phone transport for Nila's on-device brain
// (by default the stock Gemma-3-1B-it; the fine-tuned V2 4B is an optional revert/side-load, not the default).
//
// Replaces the @capgo/capacitor-llm (MediaPipe .task, flat "User:/Nila:" string) path with llama.cpp +
// a real GGUF. By default (2026-07-07 speed A/B) that GGUF is the stock, un-fine-tuned Gemma-3-1B-it; the
// therapy-tuned Gemma-3-4B QLoRA (V2) is only the brain if it is restored/side-loaded. Two things this buys us that
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
// Sentence-boundary trim for a length-capped reply (pure, unit-tested).
import { trimToLastSentence } from "./chatText";

// Side-loaded GGUF in the app's own external files dir (adb push, mirrors the capgo .task path). The
// PRODUCTION path is downloadModel() on first run — deferred; side-load validates the end-to-end brain.
const DEFAULT_MODEL_PATH =
  "/sdcard/Android/data/com.nilamind.app/files/gemma-3-1b-it-Q4_K_M.gguf";

export function createLlamaCppBackend(
  modelPath: string = DEFAULT_MODEL_PATH,
  label = "nila-gemma-3-1b-q4km",
): LocalLlmBackend {
  let ctx: LlamaContext | null = null;
  let ready = false;
  let loadFailed = false; // set if initLlama throws (e.g. a low-RAM OOM) — surfaced via loadState() (#10)
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
        n_ctx: 3072,        // short persona uses ~800 tokens; 3072 gives ample room for conversation
                            // (was 4096 — the full persona was ~2300 tokens, now much smaller)
        n_threads: 8,       // use all 8 cores on this device (was 6 — 2 spare cores aren't needed for UI)
        n_gpu_layers: 0,    // CPU-only on Android (GPU offload is iOS-only in this binding)
        flash_attn: false,  // measured: fa hurts prefill on this CPU (50->24 tok/s)
        use_mlock: true,    // pin model pages in RAM — stops the GGUF from paging to flash
      });
      ready = true;
    } catch (e) {
      // A load failure (commonly a low-RAM OOM initialising the 2.5 GB model) previously only logged here and
      // left isReady() false forever — indistinguishable from "not downloaded", so the app silently degraded to
      // the offline companion with no explanation. Record it so loadState() can surface a distinct "error" the
      // UI can explain ("model couldn't load — your device may be low on memory"). (2026-07-06 audit #10.)
      loadFailed = true;
      console.warn("[llamaCpp] model load failed:", e);
    }
  })();

  return {
    id: `gguf-llamacpp/${label}`,
    isReady: () => ready && !!ctx,
    loadState: () => (ready && ctx ? "ready" : loadFailed ? "error" : "loading"),

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
      const prompt = toGemmaPrompt(system, windowMessages(messages, undefined, system)); // cap history to fit n_ctx (accounts for the real system-prompt budget)
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
            // Hard cap on reply length. A short, warm companion reply is 1-3 sentences (~60-90 tokens);
            // 128 leaves headroom for the rare "one plain fact, then back to them" turn while making an
            // essay PHYSICALLY impossible on a 1B that ignores the persona's brevity instruction. Decode is
            // the per-token CPU cost, so this also speeds replies up. trimToLastSentence() below cleans any
            // reply that actually hits this cap so it never ends mid-thought. (Was 220 — sized before the
            // companion-mode persona + this cap made short replies the norm.)
            n_predict: 128,
            // Low temp tracks the validated greedy behaviour (briefer, more in-distribution) — the model
            // was fine-tuned for ~50-word replies; high temp drifts longer + slower to decode.
            temperature: 0.4,
            top_k: 40,
            top_p: 0.95,
            // Anti-repetition sampling. WITHOUT this the now-shipping STOCK Gemma-3-1B (small, NOT
            // brevity-tuned, and run at a low temp that sharpens the distribution) degenerates into
            // verbatim "broken record" loops — repeating one sentence for the entire reply. The binding
            // DEFAULTS these OFF (penalty_repeat:1.0 and dry_multiplier:0.0 both mean "disabled"), so we
            // MUST set them explicitly:
            //   • penalty_repeat 1.1  — the well-tested llama.cpp CLI default; enough to discourage loops
            //     without distorting the natural reuse of common words ("you", "feel") a wellness voice needs.
            //   • penalty_last_n 256  — the 64 default is shorter than a single looped clause here; 256 spans
            //     the whole reply so a multi-sentence loop is actually in the penalty window.
            //   • DRY (dry_multiplier 0.8) — penalises repeated *sequences* (not just tokens) with an
            //     exponentially growing cost; this is the decisive killer for the exact multi-sentence loop
            //     above, and gentler on legitimate word reuse than cranking penalty_repeat high would be.
            penalty_repeat: 1.1,
            penalty_last_n: 256,
            dry_multiplier: 0.8,
            dry_base: 1.75,
            dry_allowed_length: 2,
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
        // If the length cap (not the <end_of_turn> stop) ended the reply, it may dangle mid-sentence —
        // trim back to the last complete sentence so Nila never trails off.
        text = trimToLastSentence(text);
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
