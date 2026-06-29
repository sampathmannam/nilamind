// @capacitor/local-llm backend — Gemini Nano (Gemma 4 lineage), provided ON-DEVICE by Android AICore.
//
// The model is OS-managed (AICore downloads + updates Gemini Nano), so nothing is bundled or side-loaded,
// and it runs on the NPU — fast, no 2.3GB cold-mmap, none of the OOM-kill fragility the 4B GGUF hits.
// Registered behind the localLlm seam, so sendToNila routes to it under the UNCHANGED §9 gates
// (see localNila.ts). Crisis handling is never the model's job.
//
// Constraints of the ML Kit GenAI Prompt API (Alpha): NO token streaming (one full response), Android
// output capped at 256 tokens (fine — Nila replies are a few sentences), input < ~4000 tokens,
// foreground-only. The Nila persona is passed via `instructions`; conversation context is folded into
// the prompt (stateless, like the GGUF/.task adapters) rather than the plugin's sessionId, so the app
// stays the source of truth for history + §9.
import { LocalLLM } from "@capacitor/local-llm";
import type { LocalLlmBackend, LocalGenParams } from "./localLlm";
import { windowMessages } from "./gemmaPrompt";

// Fold the turns into a plain transcript and cue a Nila reply (Nano has no chat-role API).
function buildPrompt(messages: { role: "user" | "assistant"; content: string }[]): string {
  const turns = messages.map((m) => `${m.role === "user" ? "User" : "Nila"}: ${m.content}`).join("\n");
  return `${turns}\nNila:`;
}

export function createNanoBackend(): LocalLlmBackend {
  // main.tsx only registers this backend after AICore reports the Nano model 'available' (or a download
  // succeeded), so it's usable from the start. If a prompt later fails, generate() rejects and the §9 /
  // offline path takes over.
  return {
    id: "gemini-nano/gemma4",
    isReady: () => true,

    generate: async ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      if (signal?.aborted) throw new Error("aborted");
      const { text } = await LocalLLM.prompt({
        instructions: system, // the Nila persona (buildNilaSystem)
        prompt: buildPrompt(windowMessages(messages, 8000)),
        options: { temperature: 0.8, maximumOutputTokens: 256 }, // Android hard cap = 256
      });
      if (signal?.aborted) throw new Error("aborted");
      onToken(text); // no native streaming → emit the whole reply once (the onToken-once contract)
      return text;
    },
  };
}
