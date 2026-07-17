// Shared OpenAI-compatible streaming chat call — extracted 2026-07-17 QA from
// cloudLlmAdapter.ts + freeApiLlmAdapter.ts (the two adapters posted an identical
// request shape and parsed an identical SSE stream, differing only in where
// apiUrl/apiKey/model came from and the error label used in thrown errors).
//
// Pure/injectable: this module does NOT read cloudApi.ts or any other settings —
// every value it needs comes in via `opts`, so it has no hidden dependency on
// which adapter is calling it.

export interface OpenAiChatStreamOpts {
  apiUrl: string;
  apiKey: string;
  model: string;
  system: string;
  messages: { role: string; content: string }[];
  onToken: (t: string) => void;
  signal?: AbortSignal;
  errorLabel: string;
}

export async function streamOpenAiChat(opts: OpenAiChatStreamOpts): Promise<string> {
  const { apiUrl, apiKey, model, system, messages, onToken, signal, errorLabel } = opts;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
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

  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { /* response may not have text() */ }
    throw new Error(`${errorLabel} ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
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
}
