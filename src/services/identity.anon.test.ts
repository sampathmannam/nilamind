import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory secureLocal so identity create/persist runs end-to-end (BIP39 + subtle.digest) without IndexedDB.
const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  SENSITIVE_KEYS: ["nilamind_safetyplan", "nilamind_diary"],
  flush: vi.fn(async () => {}),
}));

import { ensureAnonymousIdentity, loadIdentity, isValidMnemonic } from "./identity";

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

// ensureAnonymousIdentity powers the WEB "talk-first" front door: a first-time visitor is dropped straight
// into chat with a silently-created private space (recovery phrase still stored + viewable later in Settings),
// instead of being blocked by the 12-word ceremony before they can say a word.
describe("ensureAnonymousIdentity", () => {
  it("creates and persists a valid identity when none exists yet", async () => {
    expect(loadIdentity()).toBeNull();
    const id = await ensureAnonymousIdentity();
    expect(id.userId).toBeTruthy();
    expect(isValidMnemonic(id.mnemonic)).toBe(true); // real BIP39 phrase, retrievable later in Settings
    expect(loadIdentity()?.userId).toBe(id.userId);  // actually persisted
  });

  it("returns the EXISTING identity without overwriting it (never clobbers a returning user's data key)", async () => {
    const first = await ensureAnonymousIdentity();
    const second = await ensureAnonymousIdentity();
    expect(second.userId).toBe(first.userId);
    expect(second.mnemonic).toBe(first.mnemonic);
  });
});
