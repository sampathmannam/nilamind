// On-device wake-word listener for "Nila" (Vosk WASM). Foreground-only. Privacy: nothing is
// recorded or sent — only partial hypotheses are inspected in memory for the word "nila".

import { createModel } from "vosk-browser";
import type { ServerMessagePartialResult } from "vosk-browser/dist/interfaces";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

/** True iff `partial` contains the whole word "nila" or a phonetic variant (case-insensitive, word-boundary). */
// TODO(Task 9): tune accept-set from on-device Vosk partials
export function matchesWakeWord(partial: string): boolean {
  return /\b(nila|neela|nyla|nee la|nil a|kneel a)\b/i.test(partial || "");
}

// Fix 1: Use .tgz extension — Android aapt strips .gz files during APK bundling, leaving the
// compressed payload unreadable. .tgz is left byte-for-byte intact; vosk-browser detects gzip
// by magic bytes (0x1f 0x8b), not filename, so the WASM libarchive unpacks it correctly.
const MODEL_URL = "/models/vosk-model-small-en-us-0.15.tgz";

type AnyModel = Awaited<ReturnType<typeof createModel>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognizer = any;
let model: AnyModel | null = null;
let recognizer: AnyRecognizer | null = null; // hoisted: one live recognizer at a time
let fired = false;                            // hoisted alongside recognizer
let stream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let node: ScriptProcessorNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let listening = false;
let starting = false;

export const wakeWord = {
  /** True while the audio pipeline is active. */
  isListening: () => listening,

  /**
   * Pre-grants RECORD_AUDIO, loads the Vosk model, opens the mic, wires up the audio graph,
   * and listens for partial results. When `matchesWakeWord` fires, calls `onWake()` exactly
   * once and stops. Returns false on any error.
   */
  async start(onWake: () => void): Promise<boolean> {
    if (listening || starting) return listening;
    starting = true;
    try {
      // Fix 2: Pre-grant native RECORD_AUDIO on Capacitor before getUserMedia is called.
      // Without this, the Capacitor WebView never surfaces the OS microphone dialog and
      // getUserMedia rejects with NotAllowedError.
      if (Capacitor.isNativePlatform()) {
        const perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== "granted") {
          const req = await SpeechRecognition.requestPermissions();
          if (req.speechRecognition !== "granted") {
            console.warn("[wakeWord] RECORD_AUDIO permission denied");
            return false;
          }
        }
      }

      // Load model once; keep it alive for subsequent start() calls.
      if (!model) {
        model = await createModel(MODEL_URL);
      }

      // Acquire the WebView microphone.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: false,
      });

      // Fix 3: Mobile WebViews start the AudioContext in the "suspended" state.
      // Calling resume() immediately after creation transitions it to "running".
      audioCtx = new AudioContext();
      await audioCtx.resume();

      // KaldiRecognizer is the runtime class attached to the loaded model object.
      // The vosk-browser typings don't export it directly, so we reach it via the model.
      // Dispose any previous recognizer before creating a new one — fixes "works once then
      // goes deaf": accumulated recognizers on the model's worker stop receiving events.
      // remove() API confirmed at node_modules/vosk-browser/dist/model.d.ts:32
      try { recognizer?.remove(); } catch { /* ignore */ }
      recognizer = new (model as any).KaldiRecognizer(audioCtx.sampleRate);
      fired = false;

      recognizer.on("partialresult", (msg: ServerMessagePartialResult) => {
        if (fired) return;
        const partial = msg?.result?.partial ?? "";
        if (matchesWakeWord(partial)) {
          fired = true;
          onWake();
          void wakeWord.stop();
        }
      });

      source = audioCtx.createMediaStreamSource(stream);
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      node = audioCtx.createScriptProcessor(4096, 1, 1);

      // Fix 4: try/catch inside onaudioprocess — don't fail silently but also don't surface
      // per-frame errors to the console on every callback.
      node.onaudioprocess = (e) => {
        try {
          recognizer.acceptWaveform(e.inputBuffer);
        } catch {
          /* ignore per-frame waveform errors */
        }
      };

      source.connect(node);
      node.connect(audioCtx.destination);

      listening = true;
      return true;
    } catch (err) {
      console.warn("[wakeWord] start failed:", err);
      // Transient getUserMedia/AudioContext failures self-heal on next start() attempt.
      await wakeWord.stop();
      return false;
    } finally {
      starting = false;
    }
  },

  /**
   * Disconnects the audio graph, stops mic tracks, closes the AudioContext.
   * Safe to call when already stopped / never started.
   */
  async stop(): Promise<void> {
    listening = false;
    // Dispose the recognizer FIRST so its worker message channel is closed before
    // we tear down the audio graph — prevents stale event delivery on re-start.
    try { recognizer?.remove(); } catch { /* ignore */ }
    recognizer = null;
    fired = false;
    try { node?.disconnect(); source?.disconnect(); } catch { /* ignore */ }
    stream?.getTracks().forEach((t) => t.stop());
    try { await audioCtx?.close(); } catch { /* ignore */ }
    node = null;
    source = null;
    stream = null;
    audioCtx = null;
    // model is intentionally kept alive for fast re-start
  },

  /**
   * Explicit teardown: stops the audio pipeline AND frees the Vosk model's WASM worker.
   * Call only when the user explicitly disables the feature — not on background/foreground
   * cycles (use stop() there so the model stays cached for fast resume).
   * terminate() API confirmed at node_modules/vosk-browser/dist/model.d.ts:17.
   */
  async dispose(): Promise<void> {
    await wakeWord.stop();
    try { model?.terminate(); } catch { /* ignore */ }
    model = null;
  },
};
