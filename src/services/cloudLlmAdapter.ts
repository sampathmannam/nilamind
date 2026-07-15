// Cloud LLM backend adapter — a cleaner wrapper around the cloud API for Nila.
// Unlike freeApiLlmAdapter (which is a static constructor), this adapter dynamically reads
// the cloud API settings from cloudApi.ts — so toggling the cloud preference takes effect
// immediately without re-registering the backend. Used by the runtime cloud registration in main.tsx.

import type { LocalLlmBackend, LocalGenParams } from "./localLlm";
import { isCloudApiActive, getCloudApiKey, getCloudApiUrl, getCloudApiModel } from "./cloudApi";

export function createCloudBackend(): LocalLlmBackend {
  return {
    id: "cloud-api",
    isReady: () => isCloudApiActive(),

    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      const apiKey = getCloudApiKey();
      const apiUrl = getCloudApiUrl();
      if (!apiKey) throw new Error("No cloud API key configured");

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: getCloudApiModel(),
          messages: [
            { role: "system", content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
        signal,
      });

      if (!res.ok) {
        let detail = "";
        try { detail = await res.text(); } catch { /* response may not have text() */ }
        throw new Error(`Cloud API ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
      }

      // SSE streaming path
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
            if (!trimmed || !trimmed.startsWith("data:")) continue;
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

      // Fallback: non-streaming JSON
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      if (content) onToken(content);
      return content;
    },
  };
}
