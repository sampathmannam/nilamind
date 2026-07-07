// Vulkan GPU-accelerated on-device LLM backend for Android.
//
// Uses upstream llama.cpp built with Vulkan support (libllama.so + libggml-vulkan.so).
// On Adreno 829 (Snapdragon 8 Elite), Vulkan offload turns ~16 tok/s CPU into ~30-40 tok/s.
//
// Same pattern as llamaCppLlmAdapter: registers behind §9 gates, no network, no bypass.
import LlamaGpu from "../plugins/llama-gpu/definitions";
import type { LocalLlmBackend, LocalGenParams } from "./localLlm";

const DEFAULT_MODEL_PATH =
  "/sdcard/Android/data/com.nilamind.app/files/v2-4b-Q4_K_M.gguf";

let modelReady = false;
let loadStateVal: "loading" | "ready" | "error" = "loading";

export function createVulkanLlmBackend(
  modelPath: string = DEFAULT_MODEL_PATH,
  label = "nila-v2-4b-vulkan",
): LocalLlmBackend {
  // Load the model with Vulkan GPU offload
  void (async () => {
    try {
      loadStateVal = "loading";
      const result = await LlamaGpu.init({
        model: modelPath,
        n_ctx: 2048,
        n_threads: 6,
        n_gpu_layers: 99,   // offload all layers to Vulkan GPU
      });
      if (result.ok) {
        modelReady = true;
        loadStateVal = "ready";
      } else {
        loadStateVal = "error";
        console.warn("[vulkanLlm] model init failed:", result.error);
      }
    } catch (e) {
      loadStateVal = "error";
      console.warn("[vulkanLlm] model load error:", e);
    }
  })();

  return {
    id: `gemma3-4b-vulkan/${label}`,
    isReady: () => modelReady,
    loadState: () => loadStateVal,

    warm: async (_system: string): Promise<void> => {
      // Vulkan backend handles KV cache internally
    },

    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      if (!modelReady) throw new Error("Vulkan llama model not loaded");

      // Build prompt with system instruction
      // The upstream llama.cpp handles the chat template via tokenize
      const fullPrompt = `${system}\n\n${messages.map((m) =>
        m.role === "user" ? `User: ${m.content}` : `Nila: ${m.content}`
      ).join("\n")}\nNila:`;

      try {
        const result = await LlamaGpu.completion({
          prompt: fullPrompt,
          n_predict: 80,
          temperature: 0.4,
          top_k: 40,
          top_p: 0.95,
          stop: ["<end_of_turn>", "<start_of_turn>", "\nUser:"],
        });

        // Feed the complete result through onToken for streaming consumers
        if (result.text && onToken) {
          onToken(result.text);
        }

        return result.text;
      } catch (e) {
        if (signal?.aborted) throw new Error("aborted");
        throw e;
      }
    },
  };
}
