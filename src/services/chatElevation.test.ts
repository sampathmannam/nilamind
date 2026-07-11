import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory secureLocal so the latch's note/read/clear/expiry can be tested deterministically.
let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import {
  noteChatElevation,
  chatElevationSignal,
  clearChatElevation,
  CHAT_ELEVATION_WINDOW_MS,
} from "./chatElevation";

beforeEach(() => { store = {}; });

describe("chatElevation — a cool-down latch for chat-detected elevation", () => {
  it("is 'none' with no latch", () => {
    expect(chatElevationSignal(1000)).toBe("none");
  });

  it("note('none') is a no-op (only real signals latch)", () => {
    noteChatElevation("none", 1000);
    expect(chatElevationSignal(1000)).toBe("none");
  });

  it("note('elevated') latches for the whole cool-down window", () => {
    noteChatElevation("elevated", 1000);
    expect(chatElevationSignal(1000)).toBe("elevated");
    expect(chatElevationSignal(1000 + CHAT_ELEVATION_WINDOW_MS - 1)).toBe("elevated");
  });

  it("expires once the window elapses", () => {
    noteChatElevation("high", 1000);
    expect(chatElevationSignal(1000 + CHAT_ELEVATION_WINDOW_MS)).toBe("none");
  });

  it("a fresh note refreshes the timestamp (an ongoing episode keeps it active)", () => {
    noteChatElevation("elevated", 1000);
    noteChatElevation("elevated", 1000 + CHAT_ELEVATION_WINDOW_MS - 1); // refresh near expiry
    expect(chatElevationSignal(1000 + CHAT_ELEVATION_WINDOW_MS)).toBe("elevated"); // still active from refresh
  });

  it("clear() relaxes it immediately (a check-in supersedes the inferred signal)", () => {
    noteChatElevation("elevated", 1000);
    clearChatElevation();
    expect(chatElevationSignal(1000)).toBe("none");
  });

  it("ignores malformed / wrong-shape stored data", () => {
    store["nilamind_chat_elevation"] = JSON.stringify([{ date: "x" }]);
    expect(chatElevationSignal(1000)).toBe("none");
  });
});
