import { describe, it, expect, vi } from "vitest";

vi.mock("./crisisResources", () => ({
  crisisLinesInline: () => "988 Suicide & Crisis Lifeline",
}));

vi.mock("./personaConfig", () => ({
  WELCOME_GREETING: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Good night" },
  WELCOME_GREETING_PERSONA: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Good night" },
  WELCOME_FIRST: "first",
  WELCOME_RETURNING: "returning",
}));

vi.mock("./skillRetrieval", () => ({
  relevantSkillsBlock: () => "",
}));

vi.mock("./nilaContext", () => ({
  buildPersonalContext: () => "",
  activeProtocolContextBlock: () => "",
}));

vi.mock("./asyncReflection", () => ({
  getLatestReflection: () => null,
}));

vi.mock("./distortionSpotter", () => ({
  distortionSteer: () => "",
  safeSpotDistortions: () => ({ ok: true, matches: [] }),
}));

vi.mock("./protocolIntegration", () => ({
  checkAndStartProtocol: () => null,
}));

vi.mock("./conversationMemory", () => ({
  retrieveConversationMemories: () => [],
  formatMemoryBlock: () => "",
  memoryCallbackBlock: () => "",
}));

vi.mock("./emotionalIntelligence", () => ({
  emotionalSteer: () => "",
}));

vi.mock("./personalRag", () => ({
  personalRagBlock: () => "",
}));

vi.mock("./ragWarmth", () => ({
  ragGuidanceBlock: () => "",
}));

vi.mock("./psychoed", () => ({
  searchPsychoed: () => [],
}));

vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: () => null,
    setItem: vi.fn(),
  },
}));

vi.mock("./localLlm", () => ({
  generateOnDevice: async () => null,
}));

import {
  NILA_SYSTEM_PROMPT,
  NILA_SYSTEM_PROMPT_SHORT,
  USE_SHORT_PERSONA,
  partOfDay,
  explainerQuestionSteer,
  registerSteer,
} from "./nila";

describe("NILA_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof NILA_SYSTEM_PROMPT).toBe("string");
    expect(NILA_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });
});

describe("NILA_SYSTEM_PROMPT_SHORT", () => {
  it("is a non-empty string", () => {
    expect(typeof NILA_SYSTEM_PROMPT_SHORT).toBe("string");
    expect(NILA_SYSTEM_PROMPT_SHORT.length).toBeGreaterThan(0);
  });

  it("is shorter than the full prompt", () => {
    expect(NILA_SYSTEM_PROMPT_SHORT.length).toBeLessThan(NILA_SYSTEM_PROMPT.length);
  });
});

describe("USE_SHORT_PERSONA", () => {
  it("is a boolean", () => {
    expect(typeof USE_SHORT_PERSONA).toBe("boolean");
  });
});

describe("partOfDay", () => {
  it("returns 'morning' for hour 8", () => {
    expect(partOfDay(8)).toBe("morning");
  });

  it("returns 'afternoon' for hour 14", () => {
    expect(partOfDay(14)).toBe("afternoon");
  });

  it("returns 'evening' for hour 19", () => {
    expect(partOfDay(19)).toBe("evening");
  });

  it("returns 'night' for hour 23", () => {
    expect(partOfDay(23)).toBe("night");
  });

  it("returns 'night' for hour 0", () => {
    expect(partOfDay(0)).toBe("night");
  });

  it("returns 'morning' for hour 5", () => {
    expect(partOfDay(5)).toBe("morning");
  });

  it("returns 'afternoon' for hour 12", () => {
    expect(partOfDay(12)).toBe("afternoon");
  });

  it("returns 'evening' for hour 17", () => {
    expect(partOfDay(17)).toBe("evening");
  });
});

describe("explainerQuestionSteer", () => {
  it("returns a string for a why question", () => {
    const result = explainerQuestionSteer("why do I feel this way");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a string for a how question", () => {
    const result = explainerQuestionSteer("how does this work");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty string for a non-explainer message", () => {
    expect(explainerQuestionSteer("I feel sad today")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(explainerQuestionSteer("")).toBe("");
  });
});

describe("registerSteer", () => {
  it("returns a string for a greeting", () => {
    const result = registerSteer("hey there");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a string for a should-I decision", () => {
    const result = registerSteer("should i quit my job");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty string for ordinary venting", () => {
    expect(registerSteer("I had a tough day")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(registerSteer("")).toBe("");
  });
});
