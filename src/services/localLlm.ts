// The on-device LLM runtime SEAM for Nila's brain — the fine-tuned Gemma-3-4B (V2), shipped as a GGUF.
//
// The real binding (llama.cpp via llama-cpp-capacitor) is a NATIVE, device-only dependency that
// cannot run in the web build or in node/test — so it is deliberately NOT imported here. Instead the
// native adapter REGISTERS a backend at runtime via registerLocalLlmBackend(). Until one is registered
// (e.g. on web, or before the model finishes loading on device), the on-device model is simply
// "unavailable" and Nila falls back to the calm offline companion — there is NO cloud transport. This
// keeps the app fully working, and makes the routing logic unit-testable by registering a fake backend.
//
// Shipped bindings: llamaCppLlmAdapter.ts (native — llama.cpp over the GGUF) and
// ollamaLlmAdapter.ts (desktop/dev). main.tsx registers the right one per platform once the model loads.

import { runExclusive, tryRunExclusive } from "./modelLock";

export interface LocalGenParams {
  /** Full system instruction (buildNilaSystem) — persona + on-device memory + skills. */
  system: string;
  /** The conversation so far (synthetic turns already stripped by the caller). */
  messages: { role: "user" | "assistant"; content: string }[];
  /** Called for each streamed token so the UI can render live. */
  onToken: (t: string) => void;
  /** Optional cancel signal. */
  signal?: AbortSignal;
}

export interface LocalLlmBackend {
  /** Stable id of the loaded model, e.g. "gemma-4-e2b-litert". */
  id: string;
  /** True only when a model is loaded and ready to generate right now. */
  isReady(): boolean;
  /** Stream a reply via onToken; resolve with the full text. Reject on any failure. */
  generate(params: LocalGenParams): Promise<string>;
  /**
   * Optional: prefill the (stable) system prompt into the KV cache ahead of the user's first message,
   * so that first reply reuses the cached prefix instead of paying the full ~2300-token prefill. No-op
   * for backends that don't cache a prefix. Safe to call repeatedly; failures are swallowed.
   */
  warm?(system: string): Promise<void>;
  /**
   * Optional: distinguishes WHY the model isn't ready. "loading" = still initialising; "ready" = loaded;
   * "error" = a load failure (e.g. a low-RAM OOM initialising a 2.5 GB model). Without this, a load failure
   * is indistinguishable from "not downloaded" / "still loading" and the app silently degrades to the offline
   * companion with no explanation (2026-07-06 audit #10). Backends that never fail to load may omit it.
   */
  loadState?(): "loading" | "ready" | "error";
}

let backend: LocalLlmBackend | null = null;

// Concurrency: the llama.cpp binding runs completion() synchronously on Capacitor's ONE plugin thread, so two
// overlapping completions freeze the app. ALL model access is serialized through modelLock (see that module):
// generateGuarded (chat/voice) waits its turn; generateOnDevice (reflection/coach/episode) skips if busy.
export { isModelBusy as isGenerating } from "./modelLock";

/** The native adapter calls this once its model is loaded; pass null to unregister (e.g. on unload). */
export function registerLocalLlmBackend(b: LocalLlmBackend | null): void {
  backend = b;
}

export function getLocalLlmBackend(): LocalLlmBackend | null {
  return backend;
}

/** True only when an on-device model is registered AND ready — the gate sendToNila uses to route. */
export function isLocalLlmReady(): boolean {
  return !!backend && backend.isReady();
}

/**
 * The on-device model load state, for a UI that must tell the user WHY Nila's brain isn't answering:
 *  - "none"    → no backend registered (web, or model not downloaded) — the calm offline companion is expected
 *  - "loading" → a backend is registered and still initialising (first cold load can take minutes)
 *  - "ready"   → loaded and answering
 *  - "error"   → a backend is registered but FAILED to load (e.g. low-RAM OOM on a 2.5 GB model)
 * Without "error" surfaced, a failed load looks identical to "not downloaded" and the user gets the offline
 * companion forever with no explanation (2026-07-06 audit #10).
 */
export function localLlmLoadState(): "none" | "loading" | "ready" | "error" {
  if (!backend) return "none";
  return backend.loadState?.() ?? (backend.isReady() ? "ready" : "loading");
}

/** The active model id, or null when no on-device backend is ready. */
export function localLlmId(): string | null {
  return backend && backend.isReady() ? backend.id : null;
}

/**
 * Pre-warming the on-device model is DISABLED — intentional no-op. The shipped binding
 * (llama-cpp-capacitor) runs completion() SYNCHRONOUSLY on Capacitor's single shared plugin thread
 * (LlamaCpp.java → completionNative blocks), so a BACKGROUND warm holds that thread for the entire cold
 * prefill — ~5 min on a cold launch, dominated by the 2.5 GB GGUF page-faulting in from flash — and
 * FREEZES every other native plugin queued behind it. Device-observed: on a cold start the call greeting's
 * TextToSpeech could not speak until the warm finished. Background model inference is therefore
 * incompatible with this binding; we pay the prefill on the user's FIRST message instead (foreground,
 * under the "thinking" indicator), so the greeting + STT/TTS stay responsive from a cold start. The native
 * KV prefix-reuse still speeds up later turns. Kept as a seam: a future binding that runs completion off
 * the plugin thread can re-enable warming by restoring the body below.
 */
export function warmLocalLlm(_system: string): void {
  // no-op — see the note above (re-enabling would refreeze foreground plugins on the current binding)
}

/** Generous deadlock catch-all — NOT a UX latency budget. On-device replies are legitimately slow, and
 *  with the pre-warm removed (see warmLocalLlm) the FIRST inference after a true cold start page-faults the
 *  whole ~2.5 GB GGUF in from flash — measured at ~5.5 min — with nothing pre-paying it. This must sit
 *  comfortably ABOVE that, or the first message would false-fail to the calm offline path. Later turns are
 *  fast (model cached), so this only ever bites the very first cold reply. */
const GEN_HANG_TIMEOUT_MS = 600_000;

/**
 * Run the registered backend's generate() with a HANG GUARD. The native runtime's stopCompletion can be
 * a no-op (it is on the llama.cpp Android binding), so aborting may not interrupt a true deadlock — we
 * therefore RACE a timeout that REJECTS, so the returned promise settles even if the native call never
 * returns, letting the caller fall back to the calm offline path. Composes with the caller's cancel
 * signal. EVERY on-device caller (companion + episode + coachAssist + reflection + memory) routes through
 * this so they share the same deadlock protection, rather than calling backend.generate directly.
 */
async function rawGuardedGenerate(params: LocalGenParams): Promise<string> {
  if (!backend) throw new Error("no on-device backend");
  const ctrl = new AbortController();
  const onOuter = () => ctrl.abort();
  params.signal?.addEventListener("abort", onOuter, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hang = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { ctrl.abort(); reject(new Error("on-device generate hang-timeout")); }, GEN_HANG_TIMEOUT_MS);
  });
  try {
    return await Promise.race([backend.generate({ ...params, signal: ctrl.signal }), hang]);
  } finally {
    if (timer) clearTimeout(timer);
    params.signal?.removeEventListener("abort", onOuter);
  }
}

/** PRIMARY on-device path (companion chat + voice call). Serialized through the model lock — WAITS its turn
 *  so it can never overlap another completion on the one plugin thread. */
export async function generateGuarded(params: LocalGenParams): Promise<string> {
  return runExclusive(() => rawGuardedGenerate(params));
}

/**
 * One-shot on-device generation for the non-companion features (the episode prompt, the coachAssist
 * "Ask Nila" analyses, the reflection, the memory summariser). Streams via onToken if given, and resolves
 * with the full reply. Returns null when NO model is loaded (or on a hang-timeout) so every caller
 * degrades gracefully — it never reaches the network. The caller keeps its own §9 input scan + output
 * gate around this, exactly as around the old cloud call.
 */
export async function generateOnDevice(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  onToken: (t: string) => void = () => {},
  signal?: AbortSignal,
  opts?: { wait?: boolean },
): Promise<string | null> {
  if (!backend || !backend.isReady()) return null;
  // Never start a second completion on the one plugin thread. AUX callers (reflection, coachAssist "Ask Nila")
  // pass nothing → tryRunExclusive returns null the instant the model is busy, so they defer and degrade
  // gracefully. A PRIMARY user-facing caller (the EPISODE conversation) passes { wait:true } → runExclusive so
  // it WAITS its turn and always produces a reply, rather than dropping the user to the offline walkthrough.
  const run = opts?.wait ? runExclusive : tryRunExclusive;
  try {
    const reply = await run(() => rawGuardedGenerate({ system, messages, onToken, signal }));
    return reply === null ? null : reply.trim() || null;
  } catch {
    return null;
  }
}
