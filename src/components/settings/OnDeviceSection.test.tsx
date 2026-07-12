// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// 2026-07-12 device-QA (F11): the dev-only Ollama/"ollama serve" copy shipped to real end users on-device.
// This mounts OnDeviceSection under both a native (Capacitor.isNativePlatform() === true) and web/dev
// (=== false) platform mock to pin the copy split — no Ollama/dev instructions on native.
const nativeFlag = vi.hoisted(() => ({ value: true }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => nativeFlag.value },
}));

vi.mock("../../services/localLlm", () => ({
  localLlmId: () => null, // keep the component in "Loading model…" state so the amber hint block renders
}));

import OnDeviceSection from "./OnDeviceSection";

function mockNative(isNative: boolean) {
  nativeFlag.value = isNative;
}

afterEach(cleanup);
beforeEach(() => { nativeFlag.value = true; });

describe("OnDeviceSection copy (2026-07-12: 'ollama serve' shipped to end users)", () => {
  it("native: no Ollama/dev text", () => {
    mockNative(true);
    render(<OnDeviceSection />);
    expect(screen.queryByText(/ollama/i)).toBeNull();
    expect(screen.getByText(/runs entirely on your phone/i)).toBeTruthy();
  });

  it("web/dev: keeps the Ollama hint", () => {
    mockNative(false);
    render(<OnDeviceSection />);
    expect(screen.getAllByText(/ollama/i).length).toBeGreaterThan(0);
  });
});
