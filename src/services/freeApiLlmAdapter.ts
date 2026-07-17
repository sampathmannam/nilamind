import type { LocalLlmBackend, LocalGenParams } from "./localLlm";
import { streamOpenAiChat } from "./openAiChatStream";

/**
 * Simple free API LLM backend adapter.
 *
 * This backend streams responses from an OpenAI-compatible HTTP endpoint.
 * It is intended for development/testing purposes and respects the
 * {@link LocalLlmBackend} contract used throughout the app.
 *
 * Settings are provided via the constructor arguments – typically pulled
 * from Vite env variables in `main.tsx`.
 */
export function createFreeApiBackend(apiUrl: string, apiKey: string): LocalLlmBackend {
  // Basic readiness check – can be extended to probe the endpoint if desired.
  let ready = !!apiKey;

  // Optionally ping the endpoint to set ready flag (non‑blocking).
  // fetch(`${apiUrl}/models`).then(r => { if (r.ok) ready = true; }).catch(() => {});

  return {
    id: "free-api-llm",
    isReady: () => ready,
    /**
     * Generate a response via the remote API. Supports streaming tokens if the endpoint
     * returns an OpenAI‑style server‑sent events stream. Falls back to a full JSON response.
     */
    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      return streamOpenAiChat({
        apiUrl,
        apiKey,
        model: "gpt-3.5-turbo",
        system,
        messages,
        onToken,
        signal,
        errorLabel: "Free API LLM",
      });
    },
  };
}
