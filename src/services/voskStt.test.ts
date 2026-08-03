import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "web", isNativePlatform: () => false },
}));
vi.mock("@capacitor-community/speech-recognition", () => ({
  SpeechRecognition: {
    checkPermissions: vi.fn(async () => ({ speechRecognition: "granted" })),
    requestPermissions: vi.fn(async () => ({ speechRecognition: "granted" })),
  },
}));
vi.mock("./onDeviceAssets", () => ({
  ON_DEVICE_ASSETS: { voskStt: "vosk-model" },
  getAssetUrl: vi.fn(async () => "https://mock.model.url/model.tgz"),
}));

import { voskSttAvailable, voskListenOnce, voskListenForCall, stopVosk, disposeVosk, warmVoskStt } from "./voskStt";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("voskSttAvailable", () => {
  it("returns a boolean", () => {
    const result = voskSttAvailable();
    expect(typeof result).toBe("boolean");
  });

  it("returns false on web", () => {
    expect(voskSttAvailable()).toBe(false);
  });
});

describe("voskStt functions exist and are callable", () => {
  it("voskListenOnce is a function", () => {
    expect(typeof voskListenOnce).toBe("function");
  });

  it("voskListenForCall is a function", () => {
    expect(typeof voskListenForCall).toBe("function");
  });

  it("stopVosk is a function", () => {
    expect(typeof stopVosk).toBe("function");
  });

  it("disposeVosk is a function", () => {
    expect(typeof disposeVosk).toBe("function");
  });

  it("warmVoskStt is a function", () => {
    expect(typeof warmVoskStt).toBe("function");
  });

  it("stopVosk resolves without error when nothing is active", async () => {
    await expect(stopVosk()).resolves.toBeUndefined();
  });

  it("disposeVosk resolves without error when model was never loaded", async () => {
    await expect(disposeVosk()).resolves.toBeUndefined();
  });

  it("warmVoskStt resolves without error on web (no-op)", async () => {
    await expect(warmVoskStt()).resolves.toBeUndefined();
  });
});
