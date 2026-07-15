// llama-cpp-capacitor LocalLlmBackend adapter — the NATIVE/on-phone transport for Nila's on-device brain
// (by default Qwen2.5-1.5B Q4_K_M; the stock Gemma-3-1B-it and fine-tuned V2 4B are fallback reverts).
//
// Replaces the @capgo/capacitor-llm (MediaPipe .task, flat "User:/Nila:" string) path with llama.cpp +
// a real GGUF. Two things this buys us that the MediaPipe path could not:
//   1. The model's REAL chat template (messages[] -> native jinja) instead of a flat roleless
//      transcript — the exact format V2 was validated under (fixes the silent role-confusion risk).
//      We pre-format the raw prompt string ourselves (gemmaPrompt.ts / qwenPrompt.ts) to dodge the
//      binding's crashing jinja path.
//   2. A persistent llama context whose KV cache the runtime reuses across turns (the TTFT lever).
//
// Measured on the Motorola XT2603 (SM8845, ARMv9.2, 8 fast cores): Gemma-3-1B decode ~16 tok/s,
// prefill ~50 tok/s at fa=0. Qwen2.5-1.5B expected ~10–14 tok/s (more params but GQA + smaller
// n_ctx + q8_0 KV cache close the gap). CPU-only — @cantoo/llama GPU offload is iOS-only.
//
// Native-only (cannot run in web/node/test); register it from main.tsx behind isNativePlatform() once
// the model is loaded. It plugs in behind the unchanged §9 gates (crisis input block, live stream guard,
// output safety gate) — it does NOT re-implement or bypass them; the caller keeps them around onToken.
import { initLlama, type LlamaContext } from "llama-cpp-capacitor";
import type { LocalLlmBackend, LocalGenParams } from "./localLlm";
import type { PromptFormat } from "./modelCatalog";
import { toGemmaPrompt, windowMessages } from "./gemmaPrompt";
// Sentence-boundary trim + copied-speaker-label strip for the reply (pure, unit-tested).
import { trimToLastSentence, stripSpeakerLabel } from "./chatText";
import { toQwenPrompt, windowQwenMessages } from "./qwenPrompt";

// Side-loaded GGUF in the app's own external files dir (adb push, mirrors the capgo .task path). The
// PRODUCTION path is downloadModel() on first run — deferred; side-load validates the end-to-end brain.
const DEFAULT_MODEL_PATH =
  "/sdcard/Android/data/com.nilamind.app/files/qwen2.5-1.5b-instruct-q4_k_m.gguf";

// Per-prompt-format config: which builder to use, which stop tokens, and which n_ctx context size.
interface FormatConfig {
  n_ctx: number;
  buildPrompt: (system: string, messages: { role: "user" | "assistant"; content: string }[]) => string;
  windowMessages: (messages: { role: "user" | "assistant"; content: string }[], maxChars?: number, system?: string) => { role: "user" | "assistant"; content: string }[];
  stop: string[];
  turnPattern: RegExp; // strip any fabricated future-turn markers from output
}

const FORMAT_CONFIGS: Record<PromptFormat, FormatConfig> = {
  gemma: {
    n_ctx: 3072,
    buildPrompt: toGemmaPrompt,
    windowMessages,
    stop: ["<end_of_turn>", "<start_of_turn>"],
    turnPattern: /<(?:end|start)_of_turn>/,
  },
  qwen: {
    n_ctx: 4096, // expanded from 2048 — q4_0 KV cache ~200MB, q8_0 was ~350MB. Qwen2.5 supports native 32K via YaRN rope scaling.
    buildPrompt: toQwenPrompt,
    windowMessages: windowQwenMessages,
    stop: ["<|im_end|>", "<|im_start|>"],
    turnPattern: /<\|im_(?:end|start)\|>/,
  },
};

export function createLlamaCppBackend(
  modelPath: string = DEFAULT_MODEL_PATH,
  label = "nila-llm",
  promptFormat: PromptFormat = "qwen",
): LocalLlmBackend {
  const fmt = FORMAT_CONFIGS[promptFormat];
  let ctx: LlamaContext | null = null;
  let ready = false;
  let loadFailed = false;
  let warmedSystem = "";
  let warmPromise: Promise<void> | null = null;
  let generating = false;

  void (async () => {
    try {
      ctx = await initLlama({
        model: modelPath,
        n_ctx: fmt.n_ctx,
        n_threads: 8, // ARMv9.2 fast cores — don't oversubscribe (8 physical cores, 12 would context-switch)
        n_batch: 1024, // prompt processing batch size — 1024 fits in L2 cache, faster prefill than default 512
        flash_attn: false, // disabled: Vulkan path crashed on Adreno (VK_ERROR_DEVICE_LOST), CPU path untested
        n_gpu_layers: 0,
        cache_type_k: "q4_0", // 4.5-bit KV cache — 44% smaller than q8_0 (200MB vs 350MB at 4096), negligible quality loss
        cache_type_v: "q4_0",
        use_mlock: true,
      });
      ready = true;
    } catch (e) {
      loadFailed = true;
      console.warn("[llamaCpp] model load failed:", e);
    }
  })();

  return {
    id: `gguf-llamacpp/${label}`,
    isReady: () => ready && !!ctx,
    loadState: () => (ready && ctx ? "ready" : loadFailed ? "error" : "loading"),

    warm: async (system: string): Promise<void> => {
      if (!ctx || warmPromise || generating || system === warmedSystem) return;
      const c = ctx;
      warmPromise = (async () => {
        try {
          await c.completion({ prompt: fmt.buildPrompt(system, []), n_predict: 1, temperature: 0 });
          warmedSystem = system;
        } catch {
        } finally {
          warmPromise = null;
        }
      })();
      return warmPromise;
    },

    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      if (!ctx) throw new Error("llama-cpp context not ready");
      generating = true;
      if (warmPromise) {
        try { await ctx.stopCompletion(); } catch { }
        try { await warmPromise; } catch { }
      }
      const prompt = fmt.buildPrompt(system, fmt.windowMessages(messages, undefined, system));
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
            n_predict: 128, // enough for 3-5 sentence companion replies (~100-150 tokens)
            temperature: 0.6, // moderate diversity — warm companion voice, not robotic repetition
            top_k: 40, // standard diversity — lets the model find the right empathetic register
            top_p: 0.95,
            penalty_repeat: 1.10, // standard repetition penalty — avoids loops while keeping natural phrasing
            penalty_last_n: 128, // shorter penalty window matches shorter replies
            dry_multiplier: 1.0, // stronger: 0.8 was too mild, model would still loop phrases
            dry_base: 2.0, // higher baseline makes penalty more effective for short replies
            dry_allowed_length: 2, // catch both 2-token and 3-token repeats (DRY original recommendation)
            stop: fmt.stop,
          },
          (data) => {
            if (aborted) return;
            full += data.token;
            onToken(data.token);
          },
        );
        if (aborted) throw new Error("aborted");
        let text = (res?.text || full).trim();
        const cut = text.search(fmt.turnPattern);
        if (cut !== -1) text = text.slice(0, cut).trim();
        // A small model sometimes copies the few-shot 'Nila: "..."' framing into its own reply — strip it.
        text = stripSpeakerLabel(text);
        // If the length cap (not the stop token) ended the reply, it may dangle mid-sentence —
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
