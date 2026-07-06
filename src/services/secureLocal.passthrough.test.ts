import { describe, it, expect, vi, beforeEach } from "vitest";

// Audit finding (2026-07-06 #5): when crypto/IndexedDB init failed, secureLocal flipped straight to passthrough
// mode without first reading any existing plaintext sensitive keys — so the safety plan / diary / check-ins
// rendered empty even though the data was sitting in localStorage. These tests pin the recovery behavior.

const lsStore: Record<string, string> = {};

vi.mock("./secureStore", () => ({
  initSecure: vi.fn(async () => { throw new Error("IndexedDB init failed"); }),
  isUnlocked: () => false,
  encryptValue: vi.fn(async (v: string) => ({ ct: v })),
  decryptValue: vi.fn(async (b: { ct: string }) => b.ct),
  kvGetAll: vi.fn(async () => ({})),
  kvPut: vi.fn(async () => {}),
  kvDel: vi.fn(async () => {}),
  migratedVersion: () => 0,
  setMigratedVersion: vi.fn(async () => {}),
}));

beforeEach(() => {
  for (const k of Object.keys(lsStore)) delete lsStore[k];
  vi.resetModules();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in lsStore ? lsStore[k] : null),
    setItem: (k: string, v: string) => { lsStore[k] = v; },
    removeItem: (k: string) => { delete lsStore[k]; },
  };
});

describe("secureLocal — passthrough hydrates existing plaintext before declaring failure", () => {
  it("recovers sensitive plaintext from localStorage when secure boot fails", async () => {
    lsStore["nilamind_safetyplan"] = JSON.stringify({ steps: ["call a friend"], reasons: ["my people need me"] });
    lsStore["nilamind_checkins"] = JSON.stringify([{ date: "2026-07-05", emotion: "low", intensity: 6 }]);

    const { bootSecure, secureLocal, isPassthrough } = await import("./secureLocal");
    const res = await bootSecure();

    expect(res.unlocked).toBe(true);
    expect(isPassthrough()).toBe(true);
    expect(secureLocal.getItem("nilamind_safetyplan")).toBe(lsStore["nilamind_safetyplan"]);
    expect(secureLocal.getItem("nilamind_checkins")).toBe(lsStore["nilamind_checkins"]);
  });

  it("recovers nothing when localStorage is empty, but still enters usable passthrough mode", async () => {
    const { bootSecure, secureLocal, isPassthrough } = await import("./secureLocal");
    const res = await bootSecure();

    expect(res.unlocked).toBe(true);
    expect(isPassthrough()).toBe(true);
    expect(secureLocal.getItem("nilamind_safetyplan")).toBeNull();
  });

  it("writes made in passthrough mode reach localStorage, not the broken encrypted backend", async () => {
    lsStore["nilamind_diary"] = JSON.stringify({ "2026-07-05": { skillsUsed: ["grounding"] } });

    const { bootSecure, secureLocal } = await import("./secureLocal");
    await bootSecure();
    secureLocal.setItem("nilamind_diary", "updated");

    expect(secureLocal.getItem("nilamind_diary")).toBe("updated");
    expect(lsStore["nilamind_diary"]).toBe("updated");
  });
});
