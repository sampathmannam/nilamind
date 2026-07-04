import { describe, it, expect, vi, beforeEach } from "vitest";

// A queued encrypted write can fail (DEK unavailable, IndexedDB quota/error). setItem has already returned +
// updated the in-memory cache, so without tracking the failure is SILENT and the data is gone on next boot.
// These tests pin the fix: failures are recorded, surfaced to listeners, and retried on flush.

let kvPutShouldFail = false;
const kvStore: Record<string, unknown> = {};

vi.mock("./secureStore", () => ({
  initSecure: vi.fn(async () => ({ mode: "device", unlocked: true })),
  isUnlocked: () => true,
  encryptValue: vi.fn(async (v: string) => ({ ct: v })),
  decryptValue: vi.fn(async (b: { ct: string }) => b.ct),
  kvGetAll: vi.fn(async () => ({})),
  kvPut: vi.fn(async (k: string, b: unknown) => {
    if (kvPutShouldFail) throw new Error("IndexedDB write failed");
    kvStore[k] = b;
  }),
  kvDel: vi.fn(async (k: string) => { delete kvStore[k]; }),
  migratedVersion: () => 1,
  setMigratedVersion: vi.fn(async () => {}),
}));

import { secureLocal, flush, pendingWriteFailures, onPersistError } from "./secureLocal";

beforeEach(async () => {
  kvPutShouldFail = false;
  for (const k of Object.keys(kvStore)) delete kvStore[k];
  await flush(); // clear any pending failures left by a prior test (module singleton)
});

describe("secureLocal — persist failures are tracked, surfaced, retried (no silent data loss)", () => {
  it("records + notifies a failed write instead of swallowing it", async () => {
    const seen: string[][] = [];
    const off = onPersistError((keys) => seen.push(keys));

    kvPutShouldFail = true;
    secureLocal.setItem("nilamind_safetyplan", "my safety plan");
    expect(secureLocal.getItem("nilamind_safetyplan")).toBe("my safety plan"); // cache still serves it
    await flush();

    expect(pendingWriteFailures()).toContain("nilamind_safetyplan"); // failure recorded — NOT silent
    expect(seen.some((keys) => keys.includes("nilamind_safetyplan"))).toBe(true); // listener notified
    off();
  });

  it("retries pending failures on the next flush once writes succeed again", async () => {
    kvPutShouldFail = true;
    secureLocal.setItem("nilamind_diary", "an entry");
    await flush();
    expect(pendingWriteFailures()).toContain("nilamind_diary");

    kvPutShouldFail = false; // IndexedDB recovers / store re-unlocked
    await flush();           // should retry the pending write

    expect(pendingWriteFailures()).not.toContain("nilamind_diary");
    expect(kvStore["nilamind_diary"]).toBeTruthy(); // actually persisted now
  });

  it("a successful write clears a prior failure for the same key", async () => {
    kvPutShouldFail = true;
    secureLocal.setItem("nilamind_checkins", "[1]");
    await flush();
    expect(pendingWriteFailures()).toContain("nilamind_checkins");

    kvPutShouldFail = false;
    secureLocal.setItem("nilamind_checkins", "[1,2]"); // a fresh successful write
    await flush();
    expect(pendingWriteFailures()).not.toContain("nilamind_checkins");
  });
});
