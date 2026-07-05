import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NilaUiMessage } from "./nilaSend";

// Encrypted-persistence backing mocked as a sync in-memory map (mirrors secureLocal's API). `store` = "disk":
// it PERSISTS across a simulated app restart (module reload), while sessionChat's module-level `transcript` resets.
const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  SENSITIVE_KEYS: [] as string[],
}));

const KEY = "nilamind_session_chat";

/** Load a FRESH module instance — simulates an app (re)start: `transcript` resets, `store` (disk) survives. */
async function load() {
  vi.resetModules();
  return import("./sessionChat");
}

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe("sessionChat — in-memory behavior", () => {
  it("is empty by default", async () => {
    const s = await load();
    expect(s.hasSessionChat()).toBe(false);
    expect(s.getSessionChat()).toEqual([]);
  });

  it("stores and returns the transcript across reads (survives an unmount/remount)", async () => {
    const s = await load();
    const msgs: NilaUiMessage[] = [
      { role: "assistant", content: "Hey — how are you?" },
      { role: "user", content: "not great" },
    ];
    s.setSessionChat(msgs);
    expect(s.hasSessionChat()).toBe(true);
    expect(s.getSessionChat()).toEqual(msgs);
  });

  it("returns a copy, so external mutation can't corrupt the store", async () => {
    const s = await load();
    s.setSessionChat([{ role: "user", content: "x" }]);
    const got = s.getSessionChat();
    got.push({ role: "assistant", content: "injected" });
    expect(s.getSessionChat()).toHaveLength(1); // store unchanged
  });

  it("clear resets it (session end / explicit reset)", async () => {
    const s = await load();
    s.setSessionChat([{ role: "user", content: "x" }]);
    s.clearSessionChat();
    expect(s.hasSessionChat()).toBe(false);
    expect(s.getSessionChat()).toEqual([]);
  });
});

describe("sessionChat — encrypted persistence (survives LEAVING the app, not just a tab-switch)", () => {
  it("setSessionChat writes the transcript to (encrypted) storage", async () => {
    const s = await load();
    const msgs: NilaUiMessage[] = [{ role: "user", content: "remember me" }];
    s.setSessionChat(msgs);
    expect(store[KEY]).toBeDefined();
    expect(JSON.parse(store[KEY])).toEqual(msgs);
  });

  it("rehydrates the conversation on a fresh app start (Android killed the process)", async () => {
    const first = await load();
    const msgs: NilaUiMessage[] = [
      { role: "assistant", content: "Hey — I'm glad you're here." },
      { role: "user", content: "i keep having to start over" },
    ];
    first.setSessionChat(msgs);

    // Simulate: user left the app → process killed → reopened. Module reloads; "disk" (store) persists.
    const afterRestart = await load();
    expect(afterRestart.hasSessionChat()).toBe(true);
    expect(afterRestart.getSessionChat()).toEqual(msgs);
  });

  it("clearSessionChat wipes storage too — no ghost conversation restores after 'new conversation'", async () => {
    const first = await load();
    first.setSessionChat([{ role: "user", content: "x" }]);
    first.clearSessionChat();
    expect(store[KEY]).toBeUndefined();

    const afterRestart = await load();
    expect(afterRestart.hasSessionChat()).toBe(false);
    expect(afterRestart.getSessionChat()).toEqual([]);
  });

  it("a corrupt/undecryptable stored blob never wedges the chat — starts clean", async () => {
    store[KEY] = "{ not valid json";
    const s = await load();
    expect(s.getSessionChat()).toEqual([]);
    expect(s.hasSessionChat()).toBe(false);
  });
});
