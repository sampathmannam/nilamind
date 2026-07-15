import { describe, it, expect } from "vitest";
import {
  generateNoiseSamples,
  renderLoopWav,
  getAmbientState,
  allNoiseTypes,
  type NoiseType,
} from "./ambientSound";

const SAMPLE_RATE = 44100;
const LOOP_SEC = 6;

const readStr = (view: DataView, offset: number, len: number): string =>
  Array.from({ length: len }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join("");

describe("ambientSound — noise sample generation", () => {
  it("returns a Float32Array of the requested length for every type", () => {
    for (const type of allNoiseTypes()) {
      const s = generateNoiseSamples(type, 1000);
      expect(s).toBeInstanceOf(Float32Array);
      expect(s.length).toBe(1000);
    }
  });

  it("produces finite samples, and white noise stays within [-1, 1]", () => {
    for (const type of allNoiseTypes()) {
      const s = generateNoiseSamples(type, 5000);
      expect(s.every((v) => Number.isFinite(v))).toBe(true);
    }
    const white = generateNoiseSamples("white", 5000);
    expect(white.every((v) => v >= -1 && v < 1)).toBe(true);
  });
});

describe("ambientSound — WAV loop rendering (background-audio source)", () => {
  it("emits a valid 44.1kHz mono 16-bit PCM WAV of exactly LOOP_SEC seconds", () => {
    const loopLen = SAMPLE_RATE * LOOP_SEC;
    const buf = renderLoopWav("brown");
    expect(buf).toBeInstanceOf(ArrayBuffer);
    expect(buf.byteLength).toBe(44 + loopLen * 2);

    const view = new DataView(buf);
    expect(readStr(view, 0, 4)).toBe("RIFF");
    expect(readStr(view, 8, 4)).toBe("WAVE");
    expect(readStr(view, 12, 4)).toBe("fmt ");
    expect(view.getUint16(20, true)).toBe(1);            // PCM
    expect(view.getUint16(22, true)).toBe(1);            // mono
    expect(view.getUint32(24, true)).toBe(SAMPLE_RATE);  // sample rate
    expect(view.getUint16(34, true)).toBe(16);           // bits per sample
    expect(readStr(view, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(loopLen * 2);  // data chunk size
  });

  it("renders every noise type without error", () => {
    for (const type of allNoiseTypes() as NoiseType[]) {
      expect(() => renderLoopWav(type)).not.toThrow();
    }
  });
});

describe("ambientSound — state", () => {
  it("reports not-playing with no type before any startNoise (non-DOM env)", () => {
    const s = getAmbientState();
    expect(s.playing).toBe(false);
    expect(s.type).toBeNull();
    expect(typeof s.volume).toBe("number");
  });
});
