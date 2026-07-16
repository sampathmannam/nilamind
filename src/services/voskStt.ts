// On-device speech-to-text (Vosk WASM) — free-form dictation that runs 100% on the phone.
//
// WHY: the OS speech recognizer (@capacitor-community/speech-recognition) sends spoken audio to the
// device's system service, which on Android is usually Google's cloud. This module transcribes on the
// device instead, so with it enabled *nothing you say leaves the phone* — the same guarantee the rest
// of the app already keeps for text.
//
// HOW: it reuses the exact audio pipeline proven in wakeWord.ts — the hard-won device fixes are
// deliberately duplicated here so this path can't regress the wake word:
//   • .tgz model URL (Android aapt strips .gz; .tgz survives; vosk detects gzip by magic bytes)
//   • pre-grant native RECORD_AUDIO before getUserMedia (else the WebView never shows the mic dialog)
//   • AudioContext.resume() (mobile WebViews start suspended)
//   • ScriptProcessorNode feeding recognizer.acceptWaveform(AudioBuffer)
//   • dispose the recognizer before teardown (stale-worker "goes deaf after once" fix)
//
// Difference from the wake word: a FREE-FORM KaldiRecognizer (no accept-grammar), and we listen for the
// full transcript ("result" + "partialresult") and end the turn on natural silence, not a trigger word.

import type { createModel } from "vosk-browser";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { ON_DEVICE_ASSETS, getAssetUrl } from "./onDeviceAssets";

type AnyModel = Awaited<ReturnType<typeof createModel>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognizer = any;

let model: AnyModel | null = null;
let modelLoading: Promise<AnyModel> | null = null;

// One live capture at a time (mirrors wakeWord's single-graph model).
let stream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let node: ScriptProcessorNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let recognizer: AnyRecognizer | null = null;
let finishActive: ((text: string) => void) | null = null; // set while a capture is running; stopVosk() calls it

/** Load (and cache) the Vosk model. De-duped so concurrent callers share one load. The model asset is
 *  runtime-downloaded (onDeviceAssets.ts, shared with wakeWord.ts by asset id), not bundled in the app —
 *  so this first call is a network fetch on a fresh install, cached on disk thereafter. */
function loadModel(): Promise<AnyModel> {
  if (model) return Promise.resolve(model);
  if (!modelLoading) {
    modelLoading = (async () => {
      const [{ createModel }, modelUrl] = await Promise.all([
        import("vosk-browser"),
        getAssetUrl(ON_DEVICE_ASSETS.voskStt),
      ]);
      model = await createModel(modelUrl);
      return model;
    })().catch((e) => {
      modelLoading = null; // allow a retry on next call
      throw e;
    });
  }
  return modelLoading;
}

/** Whether on-device STT can run here. Native only (Filesystem-backed model download + WASM). */
export function voskSttAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/** Warm the model ahead of first use (optional) so the first dictation isn't slowed by the load. */
export async function warmVoskStt(): Promise<void> {
  if (!voskSttAvailable()) return;
  try { await loadModel(); } catch { /* best-effort */ }
}

interface CaptureOpts {
  silenceMs: number; // once we have speech, end the turn after this much trailing silence
  noSpeechMs: number; // give up (resolve "") if nothing is heard at all
  maxMs: number; // hard cap on a single turn
}

/** Tear down the audio graph + recognizer. Safe to call repeatedly. Keeps the model cached. */
async function teardown(): Promise<void> {
  try { recognizer?.remove(); } catch { /* ignore */ }
  recognizer = null;
  try { node?.disconnect(); source?.disconnect(); } catch { /* ignore */ }
  stream?.getTracks().forEach((t) => t.stop());
  try { await audioCtx?.close(); } catch { /* ignore */ }
  node = null;
  source = null;
  stream = null;
  audioCtx = null;
  finishActive = null;
}

/**
 * Open the mic and transcribe one spoken turn on-device. Resolves with the recognised text, or "" on
 * silence. Never rejects for a *recognition* miss; only throws if the mic permission is denied and
 * `throwOnDenied` is set (listenOnce wants that; the call loop doesn't).
 */
async function capture(opts: CaptureOpts, throwOnDenied: boolean): Promise<string> {
  // If a previous capture is somehow still live, end it first (single-graph invariant).
  if (finishActive) { try { finishActive(""); } catch { /* ignore */ } await teardown(); }

  if (Capacitor.isNativePlatform()) {
    const perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== "granted") {
      const req = await SpeechRecognition.requestPermissions();
      if (req.speechRecognition !== "granted") {
        if (throwOnDenied) throw new Error("Microphone permission denied");
        return "";
      }
    }
  }

  const m = await loadModel();

  stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  audioCtx = new AudioContext();
  await audioCtx.resume();

  try { recognizer?.remove(); } catch { /* ignore */ }
  recognizer = new (m as AnyRecognizer).KaldiRecognizer(audioCtx.sampleRate);

  return await new Promise<string>((resolve) => {
    let buffer = "";
    let settled = false;
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;
    let noSpeechTimer: ReturnType<typeof setTimeout> | undefined;
    let maxTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(silenceTimer);
      clearTimeout(noSpeechTimer);
      clearTimeout(maxTimer);
      void teardown().then(() => resolve(text.trim()));
    };
    // Exposed so stopVosk() (barge-in / end-call) can end this turn with whatever was captured so far.
    finishActive = (t: string) => finish(t || buffer);

    // Reset the trailing-silence timer whenever the user is clearly still speaking.
    const bumpSilence = () => {
      clearTimeout(noSpeechTimer);
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => finish(buffer), opts.silenceMs);
    };

    recognizer.on("partialresult", (msg: AnyRecognizer) => {
      const p = (msg?.result?.partial ?? "").trim();
      if (p) bumpSilence();
    });
    recognizer.on("result", (msg: AnyRecognizer) => {
      const t = (msg?.result?.text ?? "").trim();
      if (t) { buffer = (buffer ? buffer + " " + t : t); bumpSilence(); }
    });

    noSpeechTimer = setTimeout(() => finish(""), opts.noSpeechMs);
    maxTimer = setTimeout(() => finish(buffer), opts.maxMs);

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    node = audioCtx!.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = (e) => {
      try { recognizer?.acceptWaveform(e.inputBuffer); } catch { /* ignore per-frame errors */ }
    };
    source = audioCtx!.createMediaStreamSource(stream!);
    source.connect(node);
    node.connect(audioCtx!.destination);
  });
}

/** One-shot dictation for a text field. Throws if mic permission is denied. */
export function voskListenOnce(): Promise<string> {
  return capture({ silenceMs: 1500, noSpeechMs: 8000, maxMs: 30000 }, true);
}

/** One call-loop turn. Never throws; resolves "" on silence so the hands-free loop keeps going. */
export function voskListenForCall(): Promise<string> {
  return capture({ silenceMs: 1400, noSpeechMs: 9000, maxMs: 30000 }, false);
}

/** Stop the in-progress capture, resolving it with whatever was heard so far (barge-in / end call). */
export async function stopVosk(): Promise<void> {
  if (finishActive) { try { finishActive(""); } catch { /* ignore */ } }
  else await teardown();
}

/** Free the model's WASM worker. Call only when the user turns on-device voice off. */
export async function disposeVosk(): Promise<void> {
  await stopVosk();
  try { (model as AnyRecognizer)?.terminate(); } catch { /* ignore */ }
  model = null;
  modelLoading = null;
}
