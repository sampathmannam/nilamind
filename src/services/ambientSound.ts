// Ambient sound generator — generates noise on-device. No audio files, no network. Privacy-first.
// Research: white/brown/pink/green noise for focus, sleep, and relaxation.
//
// Playback goes through a single <audio> element fed a pre-rendered, seamlessly-looping WAV blob
// (generated on-device). This is what lets Android surface a media notification with play/pause and
// keep the sound going when the app is backgrounded — a raw Web Audio graph (the previous approach)
// does neither: it can't be a MediaSession target and it suspends when the WebView goes to background.
// navigator.mediaSession wires the lock-screen / notification transport controls to the same element.

export type NoiseType = "white" | "brown" | "pink" | "green";

export interface AmbientSoundConfig {
  type: NoiseType;
  volume: number; // 0-1
}

const NOISE_LABELS: Record<NoiseType, { name: string; description: string; icon: string }> = {
  white: {
    name: "White noise",
    description: "Equal power across all frequencies — blocks distractions, helps focus.",
    icon: "📻",
  },
  brown: {
    name: "Brown noise",
    description: "Deeper, lower frequencies — like a distant rumble. Great for sleep.",
    icon: "🌊",
  },
  pink: {
    name: "Pink noise",
    description: "Balanced, natural — like rain or rustling leaves. Calming.",
    icon: "🌧️",
  },
  green: {
    name: "Green noise",
    description: "Mid-range, nature-like — simulates a forest canopy. Relaxing.",
    icon: "🌿",
  },
};

const SAMPLE_RATE = 44100;
const LOOP_SEC = 6;                                   // loop length — long enough repetition isn't obvious
const FADE_SAMPLES = Math.floor(SAMPLE_RATE * 0.05);  // 50 ms crossfade to hide the loop seam

/**
 * Generate `length` mono noise samples in roughly [-1, 1] for the given type. Pure — no Web Audio, so
 * it also runs under Node for tests.
 *   White: random samples
 *   Brown: integrated white noise (random walk)
 *   Pink:  filtered white noise (Voss-McCartney approximation)
 *   Green: pink noise with a gentle high-pass to emphasize the mid-range
 */
export function generateNoiseSamples(type: NoiseType, length: number): Float32Array {
  const data = new Float32Array(length);

  switch (type) {
    case "white": {
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      break;
    }
    case "brown": {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5; // amplify to match perceived loudness
      }
      break;
    }
    case "pink": {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      break;
    }
    case "green": {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
        data[i] = (pink - prev) * 0.5 + pink * 0.3; // gentle high-pass
        prev = pink;
      }
      break;
    }
  }

  return data;
}

/**
 * Render one seamless loop of the given noise as 16-bit PCM WAV bytes. Generates `LOOP_SEC` plus a
 * short tail, then crossfades that tail back over the head so the end of the loop flows into its
 * start with no click. Pure (returns an ArrayBuffer) so it's unit-testable without the DOM.
 */
export function renderLoopWav(type: NoiseType): ArrayBuffer {
  const loopLen = SAMPLE_RATE * LOOP_SEC;
  const raw = generateNoiseSamples(type, loopLen + FADE_SAMPLES);
  // Crossfade the head with the natural continuation past the loop point so sample[loopLen-1] → sample[0]
  // is continuous when <audio loop> wraps around.
  for (let i = 0; i < FADE_SAMPLES; i++) {
    const t = i / FADE_SAMPLES;
    raw[i] = raw[i] * t + raw[loopLen + i] * (1 - t);
  }
  return encodeWav16(raw.subarray(0, loopLen), SAMPLE_RATE);
}

function encodeWav16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);             // fmt chunk size
  view.setUint16(20, 1, true);              // PCM
  view.setUint16(22, 1, true);              // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (blockAlign * rate)
  view.setUint16(32, 2, true);              // block align (mono * 16-bit)
  view.setUint16(34, 16, true);             // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

// ── Playback state ───────────────────────────────────────────────────────────
let audioEl: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let currentType: NoiseType | null = null;
let currentVolume = 0.3;
const listeners = new Set<() => void>();

/** Subscribe to play/pause/stop changes (so the UI stays in sync when the notification drives them). */
export function subscribeAmbient(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function notify(): void {
  listeners.forEach((cb) => { try { cb(); } catch { /* a listener must never break playback */ } });
}

const clamp = (v: number): number => Math.max(0, Math.min(1, v));

function ensureEl(): HTMLAudioElement | null {
  if (typeof document === "undefined" || typeof Audio === "undefined") return null; // non-DOM (tests)
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.addEventListener("play", () => { setPlaybackState("playing"); notify(); });
    audioEl.addEventListener("pause", () => { setPlaybackState("paused"); notify(); });
  }
  return audioEl;
}

/** Start (or switch to) ambient noise. Returns the noise type now playing. */
export function startNoise(type: NoiseType, volume: number = 0.3): NoiseType {
  currentType = type;
  currentVolume = clamp(volume);

  const el = ensureEl();
  if (!el) return type; // non-DOM env — record state, no audio

  if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
  const blob = new Blob([renderLoopWav(type)], { type: "audio/wav" });
  currentUrl = URL.createObjectURL(blob);
  el.src = currentUrl;
  el.loop = true;
  el.volume = currentVolume;
  void el.play().catch(() => { /* autoplay blocked until a user gesture — togglePlay is one */ });

  setupMediaSession(type);
  notify();
  return type;
}

/** Stop ambient noise and tear down the notification. */
export function stopNoise(): void {
  currentType = null;
  if (audioEl) {
    try { audioEl.pause(); } catch { /* */ }
    audioEl.removeAttribute("src");
    try { audioEl.load(); } catch { /* */ }
  }
  if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
  clearMediaSession();
  notify();
}

/** Set volume (0-1). */
export function setVolume(volume: number): void {
  currentVolume = clamp(volume);
  if (audioEl) audioEl.volume = currentVolume;
}

/** Current state. `playing` reflects real playback (so a notification pause is visible to the UI). */
export function getAmbientState(): { playing: boolean; type: NoiseType | null; volume: number } {
  return {
    playing: !!audioEl && !audioEl.paused && currentType !== null,
    type: currentType,
    volume: currentVolume,
  };
}

/** Get noise metadata. */
export function getNoiseInfo(type: NoiseType): { name: string; description: string; icon: string } {
  return NOISE_LABELS[type];
}

/** All available noise types. */
export function allNoiseTypes(): NoiseType[] {
  return ["white", "brown", "pink", "green"];
}

// ── MediaSession (lock-screen / notification transport) ──────────────────────
function hasMediaSession(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

function setPlaybackState(state: "playing" | "paused" | "none"): void {
  if (!hasMediaSession()) return;
  try { navigator.mediaSession.playbackState = state; } catch { /* */ }
}

function setupMediaSession(type: NoiseType): void {
  if (!hasMediaSession()) return;
  const ms = navigator.mediaSession;
  try {
    if (typeof MediaMetadata !== "undefined") {
      ms.metadata = new MediaMetadata({
        title: NOISE_LABELS[type].name,
        artist: "NilaMind · Ambient sounds",
        album: "Generated on-device",
      });
    }
  } catch { /* metadata is best-effort */ }
  try {
    ms.setActionHandler("play", () => { const el = ensureEl(); if (el) void el.play().catch(() => {}); });
    ms.setActionHandler("pause", () => { if (audioEl) audioEl.pause(); });
    ms.setActionHandler("stop", () => { stopNoise(); });
  } catch { /* some handlers unsupported on some platforms — ignore */ }
  setPlaybackState("playing");
}

function clearMediaSession(): void {
  if (!hasMediaSession()) return;
  const ms = navigator.mediaSession;
  try { ms.metadata = null; } catch { /* */ }
  for (const action of ["play", "pause", "stop"] as const) {
    try { ms.setActionHandler(action, null); } catch { /* */ }
  }
  setPlaybackState("none");
}
