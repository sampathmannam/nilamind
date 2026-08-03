import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "web", isNativePlatform: () => false },
}));
vi.mock("@capacitor-community/text-to-speech", () => ({
  TextToSpeech: {
    getSupportedVoices: vi.fn(async () => ({ voices: [] })),
    speak: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
  },
}));
vi.mock("@capacitor-community/speech-recognition", () => ({
  SpeechRecognition: {},
}));
vi.mock("./afHeartVoice", () => ({
  speakAfHeart: vi.fn(async () => false),
  stopAfHeart: vi.fn(() => {}),
  AF_HEART_ID: "af_heart",
}));
vi.mock("./voskStt", () => ({
  voskListenOnce: vi.fn(async () => ""),
  voskListenForCall: vi.fn(async () => ""),
  stopVosk: vi.fn(async () => {}),
  voskSttAvailable: () => false,
}));

import { getVoicePrefs, setVoicePrefs, isVoiceEnabled, createSpeechQueue } from "./voice";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
});

beforeEach(() => {
  store.clear();
});

describe("getVoicePrefs", () => {
  it("returns defaults when nothing is stored", () => {
    const prefs = getVoicePrefs();
    expect(prefs.enabled).toBe(false);
    expect(prefs.rate).toBe(0.9);
    expect(prefs.onDeviceStt).toBe(true);
  });

  it("returns an object with expected shape", () => {
    const prefs = getVoicePrefs();
    expect(typeof prefs).toBe("object");
    expect(prefs).toHaveProperty("enabled");
    expect(prefs).toHaveProperty("rate");
  });
});

describe("setVoicePrefs", () => {
  it("merges partial prefs with defaults", () => {
    setVoicePrefs({ enabled: true });
    const prefs = getVoicePrefs();
    expect(prefs.enabled).toBe(true);
    expect(prefs.rate).toBe(0.9); // default preserved
  });

  it("overwrites previously set values", () => {
    setVoicePrefs({ rate: 0.7 });
    expect(getVoicePrefs().rate).toBe(0.7);
    setVoicePrefs({ rate: 1.1 });
    expect(getVoicePrefs().rate).toBe(1.1);
  });
});

describe("isVoiceEnabled", () => {
  it("returns a boolean", () => {
    const result = isVoiceEnabled();
    expect(typeof result).toBe("boolean");
  });

  it("returns false by default", () => {
    expect(isVoiceEnabled()).toBe(false);
  });

  it("returns true after enabling", () => {
    setVoicePrefs({ enabled: true });
    expect(isVoiceEnabled()).toBe(true);
  });
});

describe("createSpeechQueue", () => {
  it("returns an object with push method", () => {
    const q = createSpeechQueue();
    expect(typeof q.push).toBe("function");
  });

  it("returns an object with flush method", () => {
    const q = createSpeechQueue();
    expect(typeof q.flush).toBe("function");
  });

  it("returns an object with cancel method", () => {
    const q = createSpeechQueue();
    expect(typeof q.cancel).toBe("function");
  });

  it("returns an object with spoke getter", () => {
    const q = createSpeechQueue();
    expect(typeof q.spoke).toBe("boolean");
  });

  it("spoke is false initially when nothing has been pushed", () => {
    const q = createSpeechQueue();
    expect(q.spoke).toBe(false);
  });
});
