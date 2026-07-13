import { describe, it, expect, vi, beforeEach } from "vitest";

// Wave 3 Group B security fix: "nilamind_values_work" was completely absent from SENSITIVE_KEYS
// (secureLocal.ts), so valuesWork.ts data sat in plaintext localStorage forever, unlike its siblings
// nilamind_values / nilamind_values_actions. This file pins both halves of the fix:
//   1. the key is now listed (protectedLiterals.test.ts pins the exact list/count too).
//   2. the plaintext→encrypted migration sweep actually PICKS UP a pre-existing plaintext value —
//      which requires MIGRATION_VERSION to be bumped, or an already-migrated user (migratedVersion
//      already >= the gate) short-circuits past the one-time encrypt loop and the key is never moved.

let plaintextStore: Record<string, string> = {};
const kvStore: Record<string, unknown> = {};
let storedMigratedVersion = 0;

vi.mock("./secureStore", () => ({
  initSecure: vi.fn(async () => ({ mode: "device", unlocked: true })),
  isUnlocked: () => true,
  encryptValue: vi.fn(async (v: string) => ({ ct: v })),
  decryptValue: vi.fn(async (b: { ct: string }) => b.ct),
  kvGetAll: vi.fn(async () => ({ ...kvStore })),
  kvPut: vi.fn(async (k: string, b: unknown) => { kvStore[k] = b; }),
  kvDel: vi.fn(async (k: string) => { delete kvStore[k]; }),
  migratedVersion: () => storedMigratedVersion,
  setMigratedVersion: vi.fn(async (v: number) => { storedMigratedVersion = v; }),
}));

vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => (k in plaintextStore ? plaintextStore[k] : null),
    setItem: (k: string, v: string) => { plaintextStore[k] = v; },
    removeItem: (k: string) => { delete plaintextStore[k]; },
  }),
  DAY_MS: 86400000,
}));

import { SENSITIVE_KEYS, secureLocal, hydrate } from "./secureLocal";

beforeEach(() => {
  plaintextStore = {};
  for (const k of Object.keys(kvStore)) delete kvStore[k];
});

describe("secureLocal — nilamind_values_work security fix (wave 3 Group B)", () => {
  it("SENSITIVE_KEYS now includes nilamind_values_work", () => {
    expect(SENSITIVE_KEYS).toContain("nilamind_values_work");
  });

  it("moves a pre-existing plaintext nilamind_values_work value into the encrypted store on hydrate, even for a user who already completed a prior migration", async () => {
    // Simulate a user who already finished a previous migration round (an older MIGRATION_VERSION),
    // with a stray plaintext nilamind_values_work value left over from before this key was protected.
    storedMigratedVersion = 2;
    plaintextStore = { nilamind_values_work: JSON.stringify([{ id: "family", importance: 8 }]) };

    await hydrate();

    expect(secureLocal.getItem("nilamind_values_work")).toBe(JSON.stringify([{ id: "family", importance: 8 }]));
    expect(plaintextStore["nilamind_values_work"]).toBeUndefined(); // plaintext copy removed only after a verified encrypted round-trip
  });
});
