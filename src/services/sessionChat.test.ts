import { describe, it, expect, beforeEach } from "vitest";
import { getSessionChat, setSessionChat, hasSessionChat, clearSessionChat } from "./sessionChat";
import type { NilaUiMessage } from "./nilaSend";

// In-memory transcript store: lets the chat survive a tab-switch unmount WITHOUT persisting conversation text
// to disk. Ephemeral — cleared on app restart (module reload) and by clearSessionChat().
beforeEach(() => clearSessionChat());

describe("sessionChat (ephemeral in-memory transcript)", () => {
  it("is empty by default", () => {
    expect(hasSessionChat()).toBe(false);
    expect(getSessionChat()).toEqual([]);
  });

  it("stores and returns the transcript across reads (survives an unmount/remount)", () => {
    const msgs: NilaUiMessage[] = [
      { role: "assistant", content: "Hey — how are you?" },
      { role: "user", content: "not great" },
    ];
    setSessionChat(msgs);
    expect(hasSessionChat()).toBe(true);
    expect(getSessionChat()).toEqual(msgs);
  });

  it("returns a copy, so external mutation can't corrupt the store", () => {
    setSessionChat([{ role: "user", content: "x" }]);
    const got = getSessionChat();
    got.push({ role: "assistant", content: "injected" });
    expect(getSessionChat()).toHaveLength(1); // store unchanged
  });

  it("clear resets it (session end / explicit reset)", () => {
    setSessionChat([{ role: "user", content: "x" }]);
    clearSessionChat();
    expect(hasSessionChat()).toBe(false);
    expect(getSessionChat()).toEqual([]);
  });
});
