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
    n_ctx: 2048,
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
        n_threads: 8,
        n_gpu_layers: 0,
        flash_attn: false,
        cache_type_k: "q8_0",
        cache_type_v: "q8_0",
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
            n_predict: 220,
            temperature: 0.4,
            top_k: 40,
            top_p: 0.95,
            penalty_repeat: 1.1,
            penalty_last_n: 256,
            dry_multiplier: 0.8,
            dry_base: 1.75,
            dry_allowed_length: 2,
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
        if (!full && text) onToken(text);
        return text;
      } finally {
        generating = false;
        signal?.removeEventListener("abort", onAbort);
      }
    },
  };
}
