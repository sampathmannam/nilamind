import { describe, it, expect } from "vitest";
import { enhancedOfflineReply, getWelcomeMessage } from "./enhancedOffline";

describe("enhancedOfflineReply", () => {
  it("returns non-empty string for any input", () => {
    expect(enhancedOfflineReply("hello").length).toBeGreaterThan(0);
    expect(enhancedOfflineReply("").length).toBeGreaterThan(0);
    expect(enhancedOfflineReply("random unrelated text").length).toBeGreaterThan(0);
  });

  it("includes crisis lines for crisis-related input", () => {
    const reply = enhancedOfflineReply("I want to kill myself");
    expect(reply).toMatch(/\d{3}/);
  });

  it("returns warm context note for non-crisis input", () => {
    const reply = enhancedOfflineReply("hello there");
    expect(reply).toContain("on-device voice");
  });

  it("does not include warm context note for crisis input", () => {
    const reply = enhancedOfflineReply("I want to end my life");
    expect(reply).not.toContain("on-device voice");
  });

  it("returns different responses for different emotions", () => {
    const sadReply = enhancedOfflineReply("I feel so sad today");
    const happyReply = enhancedOfflineReply("I'm happy and excited");
    expect(sadReply).not.toBe(happyReply);
  });
});

describe("getWelcomeMessage", () => {
  it("returns non-empty string for new user", () => {
    const msg = getWelcomeMessage(false);
    expect(msg.length).toBeGreaterThan(0);
  });

  it("returns non-empty string for returning user", () => {
    const msg = getWelcomeMessage(true);
    expect(msg.length).toBeGreaterThan(0);
  });

  it("includes time-of-day prefix", () => {
    const msg = getWelcomeMessage(false);
    const hour = new Date().getHours();
    if (hour < 5) expect(msg).toMatch(/^Good night/);
    else if (hour < 12) expect(msg).toMatch(/^Good morning/);
    else if (hour < 17) expect(msg).toMatch(/^Hey/);
    else if (hour < 22) expect(msg).toMatch(/^Good evening/);
    else expect(msg).toMatch(/^Good night/);
  });

  it("returning user message differs from new user message", () => {
    const newMsg = getWelcomeMessage(false);
    const returnMsg = getWelcomeMessage(true);
    expect(newMsg).not.toBe(returnMsg);
  });
});
