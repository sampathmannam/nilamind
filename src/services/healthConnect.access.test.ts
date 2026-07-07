import { describe, it, expect, vi, beforeEach } from "vitest";

const plugin = vi.hoisted(() => ({
  isAvailable: async () => ({ available: true }),
  requestPermissions: async (_opts: { read: string[] }) => ({ granted: true }),
}));
const nativeFlag = vi.hoisted(() => ({ value: true }));

vi.mock("@capacitor/core", () => ({
  registerPlugin: () => plugin,
  Capacitor: { isNativePlatform: () => nativeFlag.value },
}));

const store: Record<string, string> = {};
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  }),
}));

import {
  getHealthConnectStatus,
  requestHealthConnectAccess,
  isHealthConnectEnabled,
  setHealthConnectEnabled,
} from "./healthConnect";

beforeEach(() => {
  nativeFlag.value = true;
  plugin.isAvailable = async () => ({ available: true });
  plugin.requestPermissions = async () => ({ granted: true });
  for (const k of Object.keys(store)) delete store[k];
});

describe("getHealthConnectStatus", () => {
  it("reports unavailable on non-native platforms", async () => {
    nativeFlag.value = false;
    const s = await getHealthConnectStatus();
    expect(s.available).toBe(false);
    expect(s.enabled).toBe(false);
  });

  it("reflects the enabled flag on native platforms", async () => {
    setHealthConnectEnabled(true);
    const s = await getHealthConnectStatus();
    expect(s.available).toBe(true);
    expect(s.enabled).toBe(true);
  });
});

describe("requestHealthConnectAccess", () => {
  it("sets the enabled flag", async () => {
    expect(isHealthConnectEnabled()).toBe(false);
    const res = await requestHealthConnectAccess();
    expect(res.ok).toBe(true);
    expect(isHealthConnectEnabled()).toBe(true);
  });

  it("returns not-native on web", async () => {
    nativeFlag.value = false;
    const res = await requestHealthConnectAccess();
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("not-native");
  });

  it("returns unavailable when Health Connect is not installed", async () => {
    plugin.isAvailable = async () => ({ available: false });
    const res = await requestHealthConnectAccess();
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unavailable");
  });

  it("returns denied when permission is refused", async () => {
    plugin.requestPermissions = async () => ({ granted: false });
    const res = await requestHealthConnectAccess();
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("denied");
  });

  it("returns error when the plugin throws", async () => {
    plugin.isAvailable = async () => { throw new Error("plugin missing"); };
    const res = await requestHealthConnectAccess();
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("error");
  });
});
