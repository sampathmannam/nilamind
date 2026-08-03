import { describe, it, expect, vi, beforeEach } from "vitest";

const localStorageStore: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => localStorageStore[k] ?? null,
  setItem: (k: string, v: string) => { localStorageStore[k] = v; },
  removeItem: (k: string) => { delete localStorageStore[k]; },
  clear: () => { for (const k of Object.keys(localStorageStore)) delete localStorageStore[k]; },
  get length() { return Object.keys(localStorageStore).length; },
  key: (i: number) => Object.keys(localStorageStore)[i] ?? null,
};
Object.defineProperty(globalThis, "localStorage", { value: mockStorage, writable: true });

import {
  getBrainStatus,
  setBrainStatus,
  subscribeBrain,
  shouldRespectModelDownloadSkip,
  recordModelDownloadSkipped,
} from "./brainSetup";

describe("brainSetup", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    setBrainStatus("ready");
  });

  it("getBrainStatus defaults to ready", () => {
    expect(getBrainStatus()).toBe("ready");
  });

  it("get/set round-trip", () => {
    setBrainStatus("needs-setup");
    expect(getBrainStatus()).toBe("needs-setup");
    setBrainStatus("ready");
    expect(getBrainStatus()).toBe("ready");
  });

  it("subscribeBrain fires on change", () => {
    let fired = false;
    const unsub = subscribeBrain(() => { fired = true; });
    setBrainStatus("needs-setup");
    expect(fired).toBe(true);
    unsub();
  });

  it("subscribeBrain unsubscribe stops notifications", () => {
    let count = 0;
    const unsub = subscribeBrain(() => { count++; });
    setBrainStatus("needs-setup");
    setBrainStatus("ready");
    expect(count).toBe(2);
    unsub();
    setBrainStatus("needs-setup");
    expect(count).toBe(2);
  });

  it("shouldRespectModelDownloadSkip returns false initially", () => {
    expect(shouldRespectModelDownloadSkip()).toBe(false);
  });

  it("recordModelDownloadSkipped then shouldRespectModelDownloadSkip returns true", () => {
    recordModelDownloadSkipped();
    expect(shouldRespectModelDownloadSkip()).toBe(true);
  });

  it("shouldRespectModelDownloadSkip returns false after 8 days", () => {
    recordModelDownloadSkipped();
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
    expect(shouldRespectModelDownloadSkip()).toBe(false);
  });
});
