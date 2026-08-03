import { describe, it, expect, afterEach } from "vitest";
import {
  registerLocalLlmBackend,
  getLocalLlmBackend,
  isLocalLlmReady,
  localLlmLoadState,
  localLlmId,
  warmLocalLlm,
  type LocalLlmBackend,
} from "./localLlm";

const fakeBackend: LocalLlmBackend = {
  id: "test-model",
  isReady: () => true,
  generate: async () => "reply",
};

afterEach(() => registerLocalLlmBackend(null));

describe("registerLocalLlmBackend / getLocalLlmBackend", () => {
  it("returns null when no backend is registered", () => {
    expect(getLocalLlmBackend()).toBeNull();
  });

  it("round-trips: register then get returns the same backend", () => {
    registerLocalLlmBackend(fakeBackend);
    expect(getLocalLlmBackend()).toBe(fakeBackend);
  });

  it("returns null after unregistering with null", () => {
    registerLocalLlmBackend(fakeBackend);
    registerLocalLlmBackend(null);
    expect(getLocalLlmBackend()).toBeNull();
  });
});

describe("isLocalLlmReady", () => {
  it("returns false when no backend is registered", () => {
    expect(isLocalLlmReady()).toBe(false);
  });

  it("returns true when a ready backend is registered", () => {
    registerLocalLlmBackend(fakeBackend);
    expect(isLocalLlmReady()).toBe(true);
  });

  it("returns false when backend is not ready", () => {
    const notReady: LocalLlmBackend = { id: "lazy", isReady: () => false, generate: async () => "" };
    registerLocalLlmBackend(notReady);
    expect(isLocalLlmReady()).toBe(false);
  });
});

describe("localLlmLoadState", () => {
  it("returns 'none' initially (no backend)", () => {
    expect(localLlmLoadState()).toBe("none");
  });

  it("returns 'ready' when backend has no loadState but isReady is true", () => {
    registerLocalLlmBackend(fakeBackend);
    expect(localLlmLoadState()).toBe("ready");
  });

  it("returns 'loading' when backend has no loadState and isReady is false", () => {
    const loading: LocalLlmBackend = { id: "loading", isReady: () => false, generate: async () => "" };
    registerLocalLlmBackend(loading);
    expect(localLlmLoadState()).toBe("loading");
  });

  it("returns loadState from backend when provided", () => {
    const errBackend: LocalLlmBackend = {
      id: "broken",
      isReady: () => false,
      generate: async () => "",
      loadState: () => "error",
    };
    registerLocalLlmBackend(errBackend);
    expect(localLlmLoadState()).toBe("error");
  });
});

describe("localLlmId", () => {
  it("returns null when no backend is registered", () => {
    expect(localLlmId()).toBeNull();
  });

  it("returns the backend id when ready", () => {
    registerLocalLlmBackend(fakeBackend);
    expect(localLlmId()).toBe("test-model");
  });

  it("returns null when backend is not ready", () => {
    const notReady: LocalLlmBackend = { id: "sleepy", isReady: () => false, generate: async () => "" };
    registerLocalLlmBackend(notReady);
    expect(localLlmId()).toBeNull();
  });
});

describe("warmLocalLlm", () => {
  it("is a function that can be called without throwing", () => {
    expect(typeof warmLocalLlm).toBe("function");
    expect(() => warmLocalLlm("system prompt")).not.toThrow();
  });
});
