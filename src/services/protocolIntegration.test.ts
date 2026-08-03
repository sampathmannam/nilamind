import { describe, it, expect, beforeEach } from "vitest";
import {
  detectProtocolTrigger,
  getProtocolSystemPrompt,
  checkAndStartProtocol,
} from "./protocolIntegration";
import { abandonProtocol } from "./conversationProtocols";

describe("detectProtocolTrigger", () => {
  beforeEach(() => abandonProtocol());

  it("returns null for non-matching text", () => {
    expect(detectProtocolTrigger("hello there")).toBeNull();
    expect(detectProtocolTrigger("what's the weather")).toBeNull();
    expect(detectProtocolTrigger("i like pizza")).toBeNull();
    expect(detectProtocolTrigger("")).toBeNull();
  });

  it('returns grounding protocol for "anxious"', () => {
    const result = detectProtocolTrigger("i feel anxious");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("grounding");
  });

  it('returns grounding protocol for "anxious"', () => {
    const result = detectProtocolTrigger("i feel anxious");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("grounding");
  });

  it("returns grounding protocol for other anxiety keywords", () => {
    expect(detectProtocolTrigger("i'm panicking")!.id).toBe("grounding");
    expect(detectProtocolTrigger("i'm freaking out")!.id).toBe("grounding");
    expect(detectProtocolTrigger("i feel overwhelmed")!.id).toBe("grounding");
  });

  it("returns moodCheckIn for emotional confusion keywords", () => {
    const result = detectProtocolTrigger("i feel weird");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("moodCheckIn");
  });

  it("returns windDown for sleep keywords", () => {
    const result = detectProtocolTrigger("i can't sleep");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("windDown");
  });

  it("returns strengths for hopelessness keywords", () => {
    const result = detectProtocolTrigger("i feel hopeless");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("strengths");
  });

  it("returns connection for loneliness keywords", () => {
    const result = detectProtocolTrigger("i feel lonely");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("connection");
  });
});

describe("getProtocolSystemPrompt", () => {
  beforeEach(() => abandonProtocol());

  it("returns null when no protocol is active", () => {
    expect(getProtocolSystemPrompt()).toBeNull();
  });
});

describe("checkAndStartProtocol", () => {
  beforeEach(() => abandonProtocol());

  it("returns null when no protocol matches", () => {
    expect(checkAndStartProtocol("hello")).toBeNull();
  });

  it("returns a string (system prompt) when a protocol is triggered", () => {
    const result = checkAndStartProtocol("i feel anxious");
    expect(typeof result).toBe("string");
    expect(result).not.toBeNull();
    expect(result!).toContain("grounding");
  });

  it("returns null after a protocol completes via exit response", () => {
    checkAndStartProtocol("i feel anxious");
    const result = checkAndStartProtocol("not now");
    expect(result).toBeNull();
  });

  it("returns a prompt when protocol is active and advancing", () => {
    checkAndStartProtocol("i feel anxious");
    const result = checkAndStartProtocol("yes sure");
    expect(typeof result).toBe("string");
  });
});
