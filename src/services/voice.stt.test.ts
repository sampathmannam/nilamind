import { describe, it, expect, vi, beforeEach } from "vitest";

// Pins the privacy-critical behaviour of the on-device STT preference: it must default ON (Vosk, so
// spoken audio never leaves the phone), including for EXISTING users whose stored prefs predate the
// field — and it must be switchable to the system recognizer.

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
vi.mock("@capacitor-community/text-to-speech", () => ({
  TextToSpeech: { getSupportedVoices: vi.fn(async () => ({ voices: [] })), speak: vi.fn(async () => {}), stop: vi.fn(async () => {}) },
}));
vi.mock("@capacitor-community/speech-recognition", () => ({ SpeechRecognition: {} }));
vi.mock("./afHeartVoice", () => ({ speakAfHeart: vi.fn(async () => false), stopAfHeart: vi.fn(() => {}), AF_HEART_ID: "af_heart" }));
vi.mock("./voskStt", () => ({
  voskListenOnce: vi.fn(async () => ""),
  voskListenForCall: vi.fn(async () => ""),
  stopVosk: vi.fn(async () => {}),
  voskSttAvailable: () => false,
}));

import { getVoicePrefs, setVoicePrefs, isOnDeviceStt } from "./voice";

// The node test env has no localStorage — stub it (mirrors inflectionPrefs.test.ts / checkin.test.ts).
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
});

const KEY = "nilamind_voice";

beforeEach(() => store.clear());

describe("on-device STT preference (privacy default)", () => {
  it("defaults ON when nothing is stored", () => {
    expect(getVoicePrefs().onDeviceStt).toBe(true);
    expect(isOnDeviceStt()).toBe(true);
  });

  it("stays ON for existing users whose stored prefs predate the field", () => {
    localStorage.setItem(KEY, JSON.stringify({ enabled: true, rate: 0.9 })); // no onDeviceStt key
    expect(isOnDeviceStt()).toBe(true);
  });

  it("can be turned off (fall back to the system recognizer) and read back", () => {
    setVoicePrefs({ onDeviceStt: false });
    expect(getVoicePrefs().onDeviceStt).toBe(false);
    expect(isOnDeviceStt()).toBe(false);
  });

  it("re-enabling restores the private path", () => {
    setVoicePrefs({ onDeviceStt: false });
    setVoicePrefs({ onDeviceStt: true });
    expect(isOnDeviceStt()).toBe(true);
  });
});
