import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory secureLocal so the backup crypto (backupKey PBKDF2 + AES-GCM) is exercised end-to-end without
// IndexedDB. These lock the v2 per-backup-random-salt change: correct round-trip, distinct salts, wrong-phrase
// rejection. (Backward-compat with legacy v1 fixed-salt blobs is handled by the salt-absent fallback branch.)
const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  },
  SENSITIVE_KEYS: ["nilamind_safetyplan", "nilamind_diary"],
  flush: vi.fn(async () => {}),
}));

import { exportBackup, importBackup } from "./identity";

const PHRASE = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const WRONG = "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong";

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe("backup export/import — v2 per-backup random salt", () => {
  it("round-trips data with the correct phrase and emits a v2 blob", async () => {
    store["nilamind_safetyplan"] = "when I stop eating";
    store["nilamind_diary"] = "[1,2,3]";

    const blob = await exportBackup(PHRASE);
    const outer = JSON.parse(atob(blob));
    expect(outer.v).toBe(2);
    expect(typeof outer.salt).toBe("string"); // per-backup salt carried in the blob
    expect(outer.iter).toBe(600000); // hardened iteration count

    delete store["nilamind_safetyplan"];
    delete store["nilamind_diary"];
    const n = await importBackup(blob, PHRASE);
    expect(n).toBe(2);
    expect(store["nilamind_safetyplan"]).toBe("when I stop eating");
    expect(store["nilamind_diary"]).toBe("[1,2,3]");
  });

  it("uses a DIFFERENT random salt for each export", async () => {
    store["nilamind_safetyplan"] = "x";
    const a = JSON.parse(atob(await exportBackup(PHRASE)));
    const b = JSON.parse(atob(await exportBackup(PHRASE)));
    expect(a.salt).not.toBe(b.salt);
  });

  it("rejects a wrong phrase (AES-GCM auth failure)", async () => {
    store["nilamind_safetyplan"] = "x";
    const blob = await exportBackup(PHRASE);
    await expect(importBackup(blob, WRONG)).rejects.toThrow();
  });
});
