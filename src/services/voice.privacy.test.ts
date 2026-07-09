import { describe, it, expect, vi, beforeEach } from "vitest";

// audit #6 + #15 + #26: on native, when the user has "On-device voice (private)" ON (the default), a Vosk
// failure must NOT silently route spoken audio to the OS/Google cloud recognizer; and the TTS picker must
// list on-device voices before cloud ones. These paths were previously untested.

const h = vi.hoisted(() => ({
  voskListenOnce: vi.fn<() => Promise<string>>(),
  voskListenForCall: vi.fn<() => Promise<string>>(),
  startSpy: vi.fn(async () => ({ matches: ["CLOUD RESULT"] })),
  voskAvailable: { value: true },
  voices: [
    { name: "Cloud Rich", lang: "en-US", localService: false, voiceURI: "cloud1" },
    { name: "On-Device", lang: "en-US", localService: true, voiceURI: "local1" },
  ],
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" } }));
vi.mock("@capacitor-community/text-to-speech", () => ({
  TextToSpeech: { getSupportedVoices: vi.fn(async () => ({ voices: h.voices })), speak: vi.fn(async () => {}), stop: vi.fn(async () => {}) },
}));
vi.mock("@capacitor-community/speech-recognition", () => ({
  SpeechRecognition: {
    start: h.startSpy,
    stop: vi.fn(async () => {}),
    checkPermissions: vi.fn(async () => ({ speechRecognition: "granted" })),
    requestPermissions: vi.fn(async () => ({ speechRecognition: "granted" })),
    available: vi.fn(async () => ({ available: true })),
  },
}));
vi.mock("./afHeartVoice", () => ({ speakAfHeart: vi.fn(async () => false), stopAfHeart: vi.fn(() => {}), AF_HEART_ID: "af_heart" }));
vi.mock("./voskStt", () => ({
  voskListenOnce: () => h.voskListenOnce(),
  voskListenForCall: () => h.voskListenForCall(),
  stopVosk: vi.fn(async () => {}),
  voskSttAvailable: () => h.voskAvailable.value,
}));

import { listenOnce, listenForCall, listEnglishVoices, setVoicePrefs } from "./voice";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
});

beforeEach(() => {
  store.clear();
  h.startSpy.mockClear();
  h.voskListenOnce.mockReset();
  h.voskListenForCall.mockReset();
  h.voskAvailable.value = true;
});

describe("STT fails closed when on-device voice is ON (audit #6)", () => {
  it("listenOnce does NOT fall back to the cloud recognizer when Vosk fails", async () => {
    h.voskListenOnce.mockRejectedValue(new Error("vosk model load failed"));
    await expect(listenOnce()).rejects.toThrow();
    expect(h.startSpy).not.toHaveBeenCalled(); // audio never routed to the system/cloud recognizer
  });

  it("listenForCall returns '' (never cloud) when Vosk fails and on-device is ON", async () => {
    h.voskListenForCall.mockRejectedValue(new Error("vosk init failed"));
    const r = await listenForCall();
    expect(r).toBe("");
    expect(h.startSpy).not.toHaveBeenCalled();
  });

  it("permission errors still propagate", async () => {
    h.voskListenOnce.mockRejectedValue(new Error("Microphone permission denied"));
    await expect(listenOnce()).rejects.toThrow(/permission/i);
    expect(h.startSpy).not.toHaveBeenCalled();
  });

  it("uses the system recognizer ONLY when the user turned on-device OFF (explicit consent)", async () => {
    setVoicePrefs({ onDeviceStt: false });
    const r = await listenOnce();
    expect(h.startSpy).toHaveBeenCalled();
    expect(r).toBe("CLOUD RESULT");
    expect(h.voskListenOnce).not.toHaveBeenCalled();
  });
});

describe("TTS voice ordering is privacy-first (audit #15)", () => {
  it("lists on-device voices before cloud/network voices", async () => {
    const voices = await listEnglishVoices();
    expect(voices[0].local).toBe(true);
    expect(voices.some((v) => !v.local)).toBe(true); // network still offered, just not first
  });
});
