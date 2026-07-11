import type { LocalLlmBackend, LocalGenParams } from "./localLlm";

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
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Free API LLM ${res.status}`);
      }

      // If the response has a body, attempt to stream token‑by‑token.
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // OpenAI streams lines prefixed with "data: "
            if (!trimmed.startsWith("data:")) continue;
            const json = trimmed.slice(5).trim();
            if (json === "[DONE]") return full;
            try {
              const payload = JSON.parse(json);
              const token = payload?.choices?.[0]?.delta?.content;
              if (token) {
                onToken(token);
                full += token;
              }
            } catch {
              // ignore malformed line
            }
          }
        }
        return full;
      }

      // Fallback: read full JSON response (non‑streaming)
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      if (content) onToken(content);
      return content;
    },
  };
}
