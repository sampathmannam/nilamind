import { describe, it, expect, beforeEach } from "vitest";

import {
  getActiveProtocol,
  isProtocolActive,
  startProtocol,
  completeProtocol,
  abandonProtocol,
  advanceProtocol,
  repeatStep,
} from "./conversationProtocols";

describe("conversationProtocols", () => {
  beforeEach(() => {
    abandonProtocol();
  });

  it("getActiveProtocol returns null initially", () => {
    expect(getActiveProtocol()).toBeNull();
  });

  it("isProtocolActive returns false initially", () => {
    expect(isProtocolActive()).toBe(false);
  });

  it("startProtocol sets active state", () => {
    startProtocol("test-proto");
    const active = getActiveProtocol();
    expect(active).not.toBeNull();
    expect(active!.protocolId).toBe("test-proto");
    expect(active!.currentStepIndex).toBe(0);
    expect(active!.startedAt).toBeTypeOf("number");
  });

  it("isProtocolActive returns true after startProtocol", () => {
    startProtocol("test-proto");
    expect(isProtocolActive()).toBe(true);
  });

  it("completeProtocol clears state and returns protocolId", () => {
    startProtocol("my-proto");
    const id = completeProtocol();
    expect(id).toBe("my-proto");
    expect(getActiveProtocol()).toBeNull();
    expect(isProtocolActive()).toBe(false);
  });

  it("completeProtocol returns empty string when no protocol active", () => {
    expect(completeProtocol()).toBe("");
  });

  it("abandonProtocol clears state", () => {
    startProtocol("test-proto");
    abandonProtocol();
    expect(getActiveProtocol()).toBeNull();
    expect(isProtocolActive()).toBe(false);
  });

  it("advanceProtocol increments step", () => {
    startProtocol("test-proto");
    advanceProtocol();
    const active = getActiveProtocol();
    expect(active!.currentStepIndex).toBe(1);
    advanceProtocol();
    expect(getActiveProtocol()!.currentStepIndex).toBe(2);
  });

  it("repeatStep stays on same step", () => {
    startProtocol("test-proto");
    const before = getActiveProtocol()!.currentStepIndex;
    repeatStep();
    const after = getActiveProtocol()!.currentStepIndex;
    expect(after).toBe(before);
  });

  it("advanceProtocol is a no-op when no protocol active", () => {
    advanceProtocol();
    expect(getActiveProtocol()).toBeNull();
  });
});
