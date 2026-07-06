import { describe, it, expect, vi, beforeEach } from "vitest";

// Audit #5 — the REAL bug the naive fix missed. When the user has ALREADY migrated to the encrypted store
// (migratedVersion >= 1) and a LATER boot fails crypto/IndexedDB init, the real data sits in encrypted
// IndexedDB (UNREADABLE without the key) and plaintext localStorage is EMPTY (migration removed it). Silently
// entering plaintext passthrough then (a) shows an empty app and (b) shadow-writes sensitive data to plaintext.
// Correct behaviour: signal "encrypted_unavailable" (so the UI can show an honest "couldn't open your data —
// retry" screen) and DO NOT enter plaintext passthrough (no shadow of sensitive data). Recovery of the
// encrypted data is impossible without the key — honesty + no-leak is the correct outcome, not a fake recovery.

const lsStore: Record<string, string> = {};
vi.mock("./secureStore", () => ({
  initSecure: vi.fn(async () => { throw new Error("IndexedDB init failed"); }),
  isUnlocked: () => false,
  encryptValue: vi.fn(async (v: string) => ({ ct: v })),
  decryptValue: vi.fn(async (b: { ct: string }) => b.ct),
  kvGetAll: vi.fn(async () => ({})),
  kvPut: vi.fn(async () => {}),
  kvDel: vi.fn(async () => {}),
  migratedVersion: () => 1, // ALREADY migrated → encrypted data exists, plaintext was removed
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

describe("secureLocal — migrated + init failure signals locked-out, not silent-empty passthrough", () => {
  it("returns encrypted_unavailable and does NOT enter plaintext passthrough", async () => {
    const { bootSecure, isPassthrough } = await import("./secureLocal");
    const res = await bootSecure();
    expect(res.error).toBe("encrypted_unavailable");
    expect(res.unlocked).toBe(false);
    expect(isPassthrough()).toBe(false); // must NOT passthrough — else it would shadow-write plaintext
  });

  it("does NOT shadow-write sensitive data to plaintext localStorage", async () => {
    const { bootSecure, secureLocal } = await import("./secureLocal");
    await bootSecure();
    secureLocal.setItem("nilamind_safetyplan", JSON.stringify({ steps: ["x"] }));
    expect("nilamind_safetyplan" in lsStore).toBe(false); // never lands in plaintext
  });
});
