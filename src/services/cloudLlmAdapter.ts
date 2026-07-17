// Cloud LLM backend adapter — a cleaner wrapper around the cloud API for Nila.
// Unlike freeApiLlmAdapter (which is a static constructor), this adapter dynamically reads
// the cloud API settings from cloudApi.ts — so toggling the cloud preference takes effect
// immediately without re-registering the backend. Used by the runtime cloud registration in main.tsx.

import type { LocalLlmBackend, LocalGenParams } from "./localLlm";
import { isCloudApiActive, getCloudApiKey, getCloudApiUrl, getCloudApiModel } from "./cloudApi";
import { streamOpenAiChat } from "./openAiChatStream";

export function createCloudBackend(): LocalLlmBackend {
  return {
    id: "cloud-api",
    isReady: () => isCloudApiActive(),

    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      const apiKey = getCloudApiKey();
      const apiUrl = getCloudApiUrl();
      if (!apiKey) throw new Error("No cloud API key configured");

      return streamOpenAiChat({
        apiUrl,
        apiKey,
        model: getCloudApiModel(),
        system,
        messages,
        onToken,
        signal,
        errorLabel: "Cloud API",
      });
    },
  };
}
