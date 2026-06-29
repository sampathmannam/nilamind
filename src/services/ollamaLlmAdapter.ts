// Ollama LocalLlmBackend adapter — desktop dev transport for Nila.
//
// On the phone the native LiteRT-LM / @capgo adapter registers itself; here we plug in Ollama's
// HTTP streaming API so you can develop and test the on-device path without the phone. Point it
// at a running `ollama serve` (default http://localhost:11434) and it streams tokens exactly like
// the mobile backend would. Used in dev mode only; never imported in production builds.

import type { LocalLlmBackend, LocalGenParams } from "./localLlm";

function makeReader(body: ReadableStream<Uint8Array> | null): ReadableStreamDefaultReader<Uint8Array> {
  if (!body) throw new Error("Ollama response has no body");
  return body.getReader();
}

export function createOllamaBackend(
  model = "qwen2.5:7b",
  host = "http://localhost:11434"
): LocalLlmBackend {
  let ready = false;

  // Probe Ollama on creation. isReady() starts false; flips to true once the server responds.
  fetch(`${host}/api/tags`).then((r) => { if (r.ok) ready = true; }).catch(() => {});

  return {
    id: `ollama/${model}`,
    isReady: () => ready,

    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      const res = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
        signal,
      });

      if (!res.ok) throw new Error(`Ollama ${res.status}`);

      const reader = makeReader(res.body);
      const dec = new TextDecoder();
      let buf = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // Ollama streams NDJSON: one JSON object per line.
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
            const token = data.message?.content ?? "";
            if (token) {
              onToken(token);
              full += token;
            }
          } catch {
            /* malformed line — skip */
          }
        }
      }

      return full;
    },
  };
}
