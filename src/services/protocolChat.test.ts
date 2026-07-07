import { describe, it, expect, beforeEach } from "vitest";
import { startProtocolChat, continueProtocolChat, protocolOfferCard } from "./protocolChat";
import { abandonProtocol, getActiveProgress } from "./protocolProgress";

describe("protocolChat", () => {
  beforeEach(() => abandonProtocol());

  it("starts a protocol and returns the first step prompt", () => {
    const r = startProtocolChat("self-compassion");
    expect(r.kind).toBe("started");
    if (r.kind === "started") {
      expect(r.title).toBe("Self-Compassion");
      expect(r.prompt).toContain("kindness");
    }
  });

  it("returns none for an unknown protocol id", () => {
    const r = startProtocolChat("does-not-exist");
    expect(r.kind).toBe("none");
  });

  it("continues an active protocol to the next step", () => {
    startProtocolChat("behavioral-activation");
    const r = continueProtocolChat();
    expect(r.kind).toBe("advanced");
    if (r.kind === "advanced") {
      expect(r.title).toBe("Behavioral Activation");
      expect(r.prompt).toContain("something you used to do");
    }
  });

  it("returns done after the last step", () => {
    startProtocolChat("self-compassion");
    for (let i = 0; i < 4; i++) continueProtocolChat();
    const r = continueProtocolChat();
    expect(r.kind).toBe("done");
    if (r.kind === "done") expect(r.title).toBe("Self-Compassion");
    expect(getActiveProgress()).toBeNull();
  });

  it("returns none when no protocol is active", () => {
    expect(continueProtocolChat().kind).toBe("none");
  });

  it("offers a matched protocol from user text", () => {
    const card = protocolOfferCard("I hate myself");
    expect(card).not.toBeNull();
    expect(card?.protocolId).toBe("self-compassion");
    expect(card?.label).toContain("Self-Compassion");
  });

  it("shows a continue card when a protocol is already active", () => {
    startProtocolChat("behavioral-activation");
    const card = protocolOfferCard("I hate myself");
    expect(card).not.toBeNull();
    expect(card?.active).toBe(true);
    expect(card?.label).toContain("Continue");
  });

  it("does not offer a protocol on crisis text", () => {
    const card = protocolOfferCard("I want to die");
    expect(card).toBeNull();
  });
});
