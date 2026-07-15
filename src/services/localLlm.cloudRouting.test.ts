import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Cloud routing at the localLlm seam: when the user has opted in (cloud enabled + key),
// the PRIMARY conversational path (generateGuarded — chat/voice) routes to the cloud
// backend; the background/derived-data path (generateOnDevice — reflection, coach,
// memory) NEVER leaves the device regardless of the toggle.

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

import { setCloudApiEnabled, setCloudApiKey } from "./cloudApi";
import {
  registerLocalLlmBackend,
  isLocalLlmReady,
  localLlmId,
  generateGuarded,
  generateOnDevice,
  type LocalLlmBackend,
} from "./localLlm";

function makeSseResponse(tokens: string[]): Response {
  const lines = tokens.map((t) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}`);
  lines.push("data: [DONE]");
  const bytes = new TextEncoder().encode(lines.join("\n") + "\n");
  let consumed = false;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: () => {
          if (!consumed) { consumed = true; return Promise.resolve({ done: false, value: bytes }); }
          return Promise.resolve({ done: true as const, value: undefined });
        },
      }),
    },
  } as unknown as Response;
}

function makeNativeBackend(reply = "on-device reply"): LocalLlmBackend & { calls: number } {
  const b = {
    id: "fake-native",
    calls: 0,
    isReady: () => true,
    generate: async ({ onToken }: { onToken: (t: string) => void }) => {
      b.calls++;
      onToken(reply);
      return reply;
    },
  };
  return b as LocalLlmBackend & { calls: number };
}

beforeEach(() => {
  fetchMock.mockReset();
  store.clear();
  registerLocalLlmBackend(null);
});

afterEach(() => {
  registerLocalLlmBackend(null);
});

describe("cloud routing — primary conversational path", () => {
  it("isLocalLlmReady() is true when cloud is active even with NO native backend", () => {
    expect(isLocalLlmReady()).toBe(false);
    setCloudApiEnabled(true);
    setCloudApiKey("sk-test");
    expect(isLocalLlmReady()).toBe(true);
  });

  it("localLlmId() reports the cloud backend when cloud is active", () => {
    setCloudApiEnabled(true);
    setCloudApiKey("sk-test");
    expect(localLlmId()).toBe("cloud-api");
  });

  it("generateGuarded routes to cloud when active, even when a native backend is registered", async () => {
    const native = makeNativeBackend();
    registerLocalLlmBackend(native);
    setCloudApiEnabled(true);
    setCloudApiKey("sk-test");
    fetchMock.mockResolvedValueOnce(makeSseResponse(["cloud reply"]));

    const reply = await generateGuarded({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });

    expect(reply).toBe("cloud reply");
    expect(native.calls).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("generateGuarded stays on-device when cloud is disabled", async () => {
    const native = makeNativeBackend();
    registerLocalLlmBackend(native);

    const reply = await generateGuarded({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });

    expect(reply).toBe("on-device reply");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("cloud routing — background path stays on-device", () => {
  it("generateOnDevice returns null (no cloud fallback) when only cloud is active", async () => {
    setCloudApiEnabled(true);
    setCloudApiKey("sk-test");

    const out = await generateOnDevice("s", [{ role: "user", content: "hi" }]);

    expect(out).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generateOnDevice uses the native backend, never cloud, when both are available", async () => {
    const native = makeNativeBackend();
    registerLocalLlmBackend(native);
    setCloudApiEnabled(true);
    setCloudApiKey("sk-test");

    const out = await generateOnDevice("s", [{ role: "user", content: "hi" }]);

    expect(out).toBe("on-device reply");
    expect(native.calls).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
