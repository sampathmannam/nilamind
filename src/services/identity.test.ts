import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  SENSITIVE_KEYS: [],
  flush: vi.fn(async () => {}),
}));

vi.mock("./errorReporter", () => ({
  reportError: vi.fn(),
}));

import { newMnemonic, isValidMnemonic, deriveUserId, loadIdentity, saveIdentity } from "./identity";

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe("newMnemonic", () => {
  it("returns a 12-word string", () => {
    const m = newMnemonic();
    expect(typeof m).toBe("string");
    expect(m.split(" ")).toHaveLength(12);
  });

  it("generates different mnemonics on successive calls", () => {
    const a = newMnemonic();
    const b = newMnemonic();
    expect(a).not.toBe(b);
  });
});

describe("isValidMnemonic", () => {
  it("returns true for a valid BIP39 mnemonic", () => {
    const m = newMnemonic();
    expect(isValidMnemonic(m)).toBe(true);
  });

  it("returns false for an invalid mnemonic", () => {
    expect(isValidMnemonic("not a real mnemonic phrase at all")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidMnemonic("")).toBe(false);
  });
});

describe("deriveUserId", () => {
  it("returns a consistent string for the same mnemonic", async () => {
    const m = "legal winner thank year wave sausage worth useful legal winner thank yellow";
    const a = await deriveUserId(m);
    const b = await deriveUserId(m);
    expect(a).toBe(b);
  });

  it("returns a string starting with 'ma_'", async () => {
    const m = "legal winner thank year wave sausage worth useful legal winner thank yellow";
    const id = await deriveUserId(m);
    expect(id.startsWith("ma_")).toBe(true);
  });

  it("returns different IDs for different mnemonics", async () => {
    const a = await deriveUserId("legal winner thank year wave sausage worth useful legal winner thank yellow");
    const b = await deriveUserId("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about");
    expect(a).not.toBe(b);
  });
});

describe("loadIdentity / saveIdentity", () => {
  it("loadIdentity returns null when empty", () => {
    expect(loadIdentity()).toBeNull();
  });

  it("round-trips saveIdentity → loadIdentity", () => {
    const identity = {
      userId: "ma_abc123",
      mnemonic: "test mnemonic phrase here words enough for twelve total",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    saveIdentity(identity);
    const loaded = loadIdentity();
    expect(loaded).toEqual(identity);
  });

  it("overwrites previous identity on second save", () => {
    const first = { userId: "ma_1", mnemonic: "first", createdAt: "2026-01-01T00:00:00.000Z" };
    const second = { userId: "ma_2", mnemonic: "second", createdAt: "2026-02-01T00:00:00.000Z" };
    saveIdentity(first);
    saveIdentity(second);
    expect(loadIdentity()).toEqual(second);
  });
});
