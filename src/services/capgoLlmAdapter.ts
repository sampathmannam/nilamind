// @capgo/capacitor-llm LocalLlmBackend adapter — the NATIVE/on-phone transport for Nila.
//
// The device sibling of ollamaLlmAdapter (desktop). It loads a side-loaded/downloaded MediaPipe .task
// model and streams tokens through the same LocalLlmBackend shape, so sendToNila routes to it behind
// the unchanged §9 gates (see localNila.ts). Proven on the real Motorola at ~55 tok/s with Gemma 3 1B
// (Piece 4a spike, 2026-06-26). Native-only — register it from main.tsx behind Capacitor.isNativePlatform().
//
// PRODUCTION TODO: download the chosen Gemma-4 E2B model on first run instead of the side-loaded path,
// and slim buildNilaSystem to fit the on-device context window (the known hard constraint).
import { CapgoLLM } from "@capgo/capacitor-llm";
import type { LocalLlmBackend, LocalGenParams } from "./localLlm";

// Side-loaded model used to validate the end-to-end on-device path (adb push, see the spike).
const DEFAULT_MODEL_PATH = "/sdcard/Android/data/com.nilamind.app/files/gemma3-1b-it-int4.task";

// MediaPipe formats the chat as a plain "User:/Assistant:" transcript (no system role), so fold the
// Nila persona + RAG system prompt and the turns into one instruction and cue a Nila reply.
function buildPrompt(system: string, messages: { role: "user" | "assistant"; content: string }[]): string {
  const turns = messages.map((m) => `${m.role === "user" ? "User" : "Nila"}: ${m.content}`).join("\n");
  return `${system}\n\n${turns}\nNila:`;
}

export function createCapgoBackend(
  modelPath: string = DEFAULT_MODEL_PATH,
  label = "gemma3-1b-it-int4"
): LocalLlmBackend {
  let ready = false;

  // Load the model on creation (mirrors the Ollama adapter's readiness probe). isReady() starts false
  // and flips true once MediaPipe has the model in memory; a load failure simply leaves it false → the
  // gate keeps Nila on the calm offline path (no model = no reply, never a network).
  CapgoLLM.setModel({ path: modelPath, engine: "mediapipe", modelType: "task", maxTokens: 4096 })
    .then(() => { ready = true; })
    .catch((e) => { console.warn("[capgoLlm] model load failed:", e); });

  return {
    id: `gemma-mediapipe/${label}`,
    isReady: () => ready,

    generate: ({ system, messages, onToken, signal }: LocalGenParams): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        let full = "";
        let textSub: { remove: () => Promise<void> } | null = null;
        let doneSub: { remove: () => Promise<void> } | null = null;
        const cleanup = () => { void textSub?.remove(); void doneSub?.remove(); };

        const onAbort = () => { cleanup(); reject(new Error("aborted")); };
        signal?.addEventListener("abort", onAbort, { once: true });

        void (async () => {
          try {
            const { id } = await CapgoLLM.createChat();
            textSub = await CapgoLLM.addListener("textFromAi", (ev) => {
              if (ev.chatId !== id) return;
              full += ev.text;
              onToken(ev.text);
            });
            doneSub = await CapgoLLM.addListener("aiFinished", (ev) => {
              if (ev.chatId !== id) return;
              signal?.removeEventListener("abort", onAbort);
              cleanup();
              resolve(full);
            });
            await CapgoLLM.sendMessage({ chatId: id, message: buildPrompt(system, messages) });
          } catch (e) {
            signal?.removeEventListener("abort", onAbort);
            cleanup();
            reject(e);
          }
        })();
      });
    },
  };
}
