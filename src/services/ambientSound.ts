// Ambient sound generator — generates noise on-device using Web Audio API.
// No audio files needed, no network calls. Privacy-first.
// Research: white/brown/pink/green noise for focus, sleep, and relaxation.

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

let audioContext: AudioContext | null = null;
let noiseNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let currentType: NoiseType | null = null;
let currentVolume = 0;

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Generate a noise buffer for the given type.
 * White: random samples
 * Brown: integrated white noise (random walk)
 * Pink: filtered white noise (Voss-McCartney algorithm approximation)
 * Green: mid-range filtered (pink + high-pass)
 */
function generateNoiseBuffer(ctx: AudioContext, type: NoiseType, durationSec: number = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  switch (type) {
    case "white": {
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
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
      // Simplified Voss-McCartney: multiple octaves of random values
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
      // Green noise: pink noise with a gentle high-pass to emphasize mid-range
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
        // Gentle high-pass: subtract low frequencies
        data[i] = (pink - prev) * 0.5 + pink * 0.3;
        prev = pink;
      }
      break;
    }
  }

  return buffer;
}

/** Start playing ambient noise. Returns the noise type being played. */
export function startNoise(type: NoiseType, volume: number = 0.3): NoiseType {
  const ctx = getContext();

  // Stop existing noise if playing
  if (noiseNode) {
    try { noiseNode.stop(); } catch { /* */ }
    noiseNode = null;
  }

  // Generate and play
  const buffer = generateNoiseBuffer(ctx, type);
  noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;
  noiseNode.loop = true;

  gainNode = ctx.createGain();
  gainNode.gain.value = volume;

  noiseNode.connect(gainNode);
  gainNode.connect(ctx.destination);
  noiseNode.start();

  currentType = type;
  currentVolume = volume;
  return type;
}

/** Stop playing ambient noise. */
export function stopNoise(): void {
  if (noiseNode) {
    try { noiseNode.stop(); } catch { /* */ }
    noiseNode = null;
  }
  if (gainNode) {
    try { gainNode.disconnect(); } catch { /* */ }
    gainNode = null;
  }
  currentType = null;
  currentVolume = 0;
}

/** Set volume (0-1). */
export function setVolume(volume: number): void {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (gainNode) {
    gainNode.gain.value = currentVolume;
  }
}

/** Get current state. */
export function getAmbientState(): { playing: boolean; type: NoiseType | null; volume: number } {
  return {
    playing: currentType !== null,
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
