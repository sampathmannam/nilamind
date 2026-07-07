// Vulkan GPU-accelerated on-device LLM backend for Android.
//
// Uses upstream llama.cpp built with Vulkan support (libllama.so + libggml-vulkan.so).
// On Adreno 829 (Snapdragon 8 Elite), Vulkan offload turns ~16 tok/s CPU into ~30-40 tok/s.
//
// Same pattern as llamaCppLlmAdapter: registers behind §9 gates, no network, no bypass.
import LlamaGpu from "../plugins/llama-gpu/definitions";
import type { LocalLlmBackend, LocalGenParams } from "./localLlm";
import { toGemmaPrompt, windowMessages } from "./gemmaPrompt";

const DEFAULT_MODEL_PATH =
  "/sdcard/Android/data/com.nilamind.app/files/v2-4b-Q4_K_M.gguf";

let modelReady = false;
let loadStateVal: "loading" | "ready" | "error" = "loading";

export function createVulkanLlmBackend(
  modelPath: string = DEFAULT_MODEL_PATH,
  label = "nila-v2-4b-vulkan",
): LocalLlmBackend {
  void (async () => {
    try {
      loadStateVal = "loading";
      const result = await LlamaGpu.init({
        model: modelPath,
        n_ctx: 2048,
        n_threads: 6,
        n_gpu_layers: 99,
      });
      if (result.ok) {
        modelReady = true;
        loadStateVal = "ready";
      } else {
        loadStateVal = "error";
      }
    } catch {
      loadStateVal = "error";
    }
  })();

  return {
    id: `gemma3-4b-vulkan/${label}`,
    isReady: () => modelReady,
    loadState: () => loadStateVal,

    warm: async (_system: string): Promise<void> => {},

    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      if (!modelReady) throw new Error("Vulkan llama model not loaded");

      const prompt = toGemmaPrompt(system, windowMessages(messages, undefined, system));
      let full = "";
      let aborted = false;
      const onAbort = () => { aborted = true; };
      signal?.addEventListener("abort", onAbort, { once: true });
      try {
        const result = await LlamaGpu.completion({
          prompt,
          n_predict: 80,
          temperature: 0.4,
          top_k: 40,
          top_p: 0.95,
          stop: ["<end_of_turn>", "<start_of_turn>"],
        });

        let text = (result.text || full).trim();
        const cut = text.search(/<(?:end|start)_of_turn>/);
        if (cut !== -1) text = text.slice(0, cut).trim();
        if (!full && text) onToken(text);
        return text;
      } catch (e) {
        if (aborted || signal?.aborted) throw new Error("aborted");
        throw e;
      } finally {
        signal?.removeEventListener("abort", onAbort);
      }
    },
  };
}
