// Voice service (AUTOPILOT Phase 4): soothing text-to-speech + speech-to-text.
//
// TTS uses @capacitor-community/text-to-speech, which has a real WEB implementation (speechSynthesis)
// so "Read aloud" works in the browser preview AND natively. Profile is deliberately calm: a slightly
// slower rate and gentler pitch. STT uses @capacitor-community/speech-recognition on device, with a
// Web Speech API fallback for the preview. Voice is OFF by default and fully user-controlled.

import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { speakAfHeart, stopAfHeart, AF_HEART_ID } from "./afHeartVoice";

const VOICE_KEY = "nilamind_voice"; // non-sensitive UI pref → plain localStorage (sync, pre-gate safe)

export interface VoicePrefs {
  enabled: boolean; // auto-read Nila replies + show read-aloud controls
  rate: number; // 0.6–1.2; calm default 0.9
  voiceId?: string; // chosen device voice (voiceURI/name); undefined = the device default
}
const DEFAULTS: VoicePrefs = { enabled: false, rate: 0.9 };

export interface TtsVoice {
  id: string;
  name: string;
  lang: string;
  local: boolean; // true = fully on-device (never sends text off the phone)
}

// Voices don't change at runtime, so fetch once and cache.
let _rawVoices: any[] | null = null;
async function rawVoices(): Promise<any[]> {
  if (_rawVoices && _rawVoices.length) return _rawVoices;
  try {
    const r = await TextToSpeech.getSupportedVoices();
    const vs = (r?.voices ?? []) as any[];
    if (vs.length) _rawVoices = vs; // don't cache an empty first result (web getVoices() warms up late)
    return vs;
  } catch {
    return _rawVoices ?? [];
  }
}
const voiceKey = (v: any): string => v?.voiceURI || `${v?.name}|${v?.lang}`;

/** English voices for the picker — warmer network/neural voices first, de-duped. */
export async function listEnglishVoices(): Promise<TtsVoice[]> {
  const all = await rawVoices();
  const en = all
    .filter((v) => /^en[-_]/i.test(v?.lang || ""))
    .map((v) => ({ id: voiceKey(v), name: String(v?.name || "Voice"), lang: String(v?.lang || ""), local: !!v?.localService }));
  en.sort((a, b) => Number(a.local) - Number(b.local) || a.name.localeCompare(b.name)); // network (richer) first
  const seen = new Set<string>();
  return en.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
}

/** Resolve a stored voiceId to the plugin's current index + that voice's language. */
async function resolveVoice(voiceId?: string): Promise<{ index: number; lang: string } | undefined> {
  if (!voiceId) return undefined;
  const all = await rawVoices();
  const index = all.findIndex((v) => voiceKey(v) === voiceId);
  if (index < 0) return undefined;
  return { index, lang: String(all[index]?.lang || "en-US") };
}

const ls = (): Storage | null => {
  try { return (globalThis as any).localStorage ?? null; } catch { return null; }
};

export function getVoicePrefs(): VoicePrefs {
  try {
    const raw = ls()?.getItem(VOICE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
export function setVoicePrefs(p: Partial<VoicePrefs>): void {
  const next = { ...getVoicePrefs(), ...p };
  try { ls()?.setItem(VOICE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}
export const isVoiceEnabled = (): boolean => getVoicePrefs().enabled;

// ── Text-to-speech ──
export async function speak(text: string): Promise<void> {
  const clean = (text || "").trim();
  if (!clean) return;
  const { rate, voiceId } = getVoicePrefs();

  // af_heart (server neural voice): synthesise + play it; fall through to the device voice on failure.
  if (voiceId === AF_HEART_ID) {
    stopAfHeart();
    if (await speakAfHeart(clean)) return;
  }

  const v = await resolveVoice(voiceId);
  try {
    await stopSpeaking();
    await TextToSpeech.speak({
      text: clean,
      lang: v?.lang || "en-US",
      rate: Math.max(0.5, Math.min(1.5, rate)),
      pitch: 0.95,
      volume: 1.0,
      category: "playback",
      ...(v ? { voice: v.index } : {}),
    });
  } catch (e) {
    console.warn("TTS failed:", e);
  }
}
export async function stopSpeaking(): Promise<void> {
  stopAfHeart();
  try { await TextToSpeech.stop(); } catch { /* ignore */ }
}
/** Auto-read a Nila reply only when the user has voice turned on. */
export async function speakIfEnabled(text: string): Promise<void> {
  if (isVoiceEnabled()) await speak(text);
}

// Sequential speech queue for STREAMED replies. push() text as it arrives; complete sentences are
// spoken in order (no overlap) so Nila starts talking after the first sentence instead of waiting for
// the whole reply. flush() speaks any tail and resolves when everything has finished; cancel() stops
// immediately (barge-in / end call). One queue per call turn.
export function createSpeechQueue() {
  const pending: string[] = [];
  let buffer = "";
  let speaking = false;
  let cancelled = false;

  async function drain() {
    if (speaking) return;
    speaking = true;
    while (pending.length && !cancelled) {
      const next = pending.shift() as string;
      await speak(next); // resolves when this sentence finishes
    }
    speaking = false;
  }

  // Pull any COMPLETE sentences out of the buffer and queue them.
  function harvest() {
    const re = /[^.!?]*[.!?]+[)"'’”\s]*/g;
    let m: RegExpExecArray | null;
    let lastIndex = 0;
    const out: string[] = [];
    while ((m = re.exec(buffer)) !== null) { out.push(m[0]); lastIndex = re.lastIndex; }
    if (out.length) {
      buffer = buffer.slice(lastIndex);
      for (const s of out) { const t = s.trim(); if (t) pending.push(t); }
      void drain();
    }
  }

  return {
    push(text: string) {
      if (cancelled || !text) return;
      buffer += text;
      harvest();
    },
    async flush() {
      const tail = buffer.trim();
      buffer = "";
      if (tail && !cancelled) pending.push(tail);
      await drain();
      while (speaking) await new Promise((r) => setTimeout(r, 50));
    },
    cancel() {
      cancelled = true;
      pending.length = 0;
      buffer = "";
      void stopSpeaking();
    },
    get spoke() { return speaking || pending.length > 0; },
  };
}

// ── Speech-to-text ──
export async function sttAvailable(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try { return !!(await SpeechRecognition.available()).available; } catch { return false; }
  }
  return typeof (window as any).webkitSpeechRecognition !== "undefined" || typeof (window as any).SpeechRecognition !== "undefined";
}

/** Listen once and resolve with the recognised text (or '' if nothing heard). Requests mic permission. */
export async function listenOnce(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== "granted") {
      const req = await SpeechRecognition.requestPermissions();
      if (req.speechRecognition !== "granted") throw new Error("Microphone permission denied");
    }
    const res = await SpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: false, popup: false });
    return res?.matches?.[0] ?? "";
  }
  // Web fallback (preview / desktop browsers)
  return new Promise<string>((resolve, reject) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { reject(new Error("Speech recognition isn't supported here")); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => resolve(e.results?.[0]?.[0]?.transcript ?? "");
    rec.onerror = (e: any) => reject(new Error(e?.error || "speech recognition error"));
    try { rec.start(); } catch (e) { reject(e as Error); }
  });
}

// ── Hands-free call loop ──
// A call needs a listen that (a) NEVER rejects — silence/no-speech/errors resolve to "" so the
// conversation loop keeps going — and (b) can be cancelled mid-listen when the user ends the call or
// taps to interrupt. listenOnce() rejects on silence and can't be stopped, so the call uses these.
let activeWebRec: any = null;

/** Stop any in-progress recognition (native or web). Safe to call when nothing is listening. */
export async function stopListening(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try { await SpeechRecognition.stop(); } catch { /* ignore */ }
  } else if (activeWebRec) {
    try { activeWebRec.abort(); } catch { /* ignore */ }
    activeWebRec = null;
  }
}

/** Listen for one call turn. Resolves with the transcript, or "" on silence / no-speech / abort —
 *  never rejects, so the hands-free loop is robust. Cancel via stopListening(). */
export async function listenForCall(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await SpeechRecognition.checkPermissions();
      if (perm.speechRecognition !== "granted") {
        const req = await SpeechRecognition.requestPermissions();
        if (req.speechRecognition !== "granted") return "";
      }
      const res = await SpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: false, popup: false });
      return res?.matches?.[0] ?? "";
    } catch {
      return "";
    }
  }
  return new Promise<string>((resolve) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { resolve(""); return; }
    const rec = new SR();
    activeWebRec = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let settled = false;
    const finish = (v: string) => {
      if (settled) return;
      settled = true;
      if (activeWebRec === rec) activeWebRec = null;
      resolve(v);
    };
    rec.onresult = (e: any) => finish(e.results?.[0]?.[0]?.transcript ?? "");
    rec.onerror = () => finish("");
    rec.onend = () => finish("");
    try { rec.start(); } catch { finish(""); }
  });
}
