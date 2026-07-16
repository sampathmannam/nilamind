import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── fetch + localStorage stubs (node env has neither) ──────────────────────
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

import {
  setCloudApiEnabled,
  setCloudApiKey,
  getCloudApiKey,
  setCloudApiUrl,
  getCloudApiUrl,
  setCloudApiModel,
  getCloudApiModel,
  setCloudApiProvider,
  getCloudApiProvider,
  isCloudApiActive,
  GROQ_DEFAULT_URL,
  GROQ_DEFAULT_MODEL,
  GROQ_RECOMMENDED_MODELS,
  GROQ_KEY_PREFIX,
  validateGroqKey,
} from "./cloudApi";
import { createCloudBackend } from "./cloudLlmAdapter";

beforeEach(() => {
  fetchMock.mockReset();
  store.clear();
});

// ─────────────────────────── Provider state (Groq) ───────────────────────────

describe("cloudApi — Groq provider state", () => {
  it("defaults to Groq when nothing has been set (curated onboarding path)", () => {
    expect(getCloudApiProvider()).toBe("groq");
    expect(getCloudApiUrl()).toBe(GROQ_DEFAULT_URL);
    expect(getCloudApiModel()).toBe(GROQ_DEFAULT_MODEL);
  });

  it("setCloudApiProvider('groq') publishes the provider", () => {
    setCloudApiProvider("groq");
    expect(getCloudApiProvider()).toBe("groq");
  });

  it("setCloudApiProvider persists to localStorage on the provider key", () => {
    setCloudApiProvider("groq");
    expect(store.get("nilamind_cloud_api_provider")).toBe("groq");
  });

  it("switching from openai-compatible to groq flips URL to the Groq endpoint", () => {
    // Start on the openai-compatible preset (explicit user choice)
    setCloudApiProvider("openai-compatible");
    expect(getCloudApiUrl()).toBe("https://api.openai.com/v1/chat/completions");
    // Flip to Groq with no custom URL stored — defaults swap
    setCloudApiProvider("groq");
    expect(getCloudApiUrl()).toBe(GROQ_DEFAULT_URL);
  });

  it("setting 'groq' does NOT clobber a URL the user has already typed in", () => {
    setCloudApiUrl("https://my-proxy.example/v1/chat/completions");
    setCloudApiProvider("groq");
    // User-customised URL is preserved.
    expect(getCloudApiUrl()).toBe("https://my-proxy.example/v1/chat/completions");
  });

  it("switching from openai-compatible to groq flips model to llama-3.1-8b-instant", () => {
    setCloudApiProvider("openai-compatible");
    expect(getCloudApiModel()).toBe("gpt-3.5-turbo");
    setCloudApiProvider("groq");
    expect(getCloudApiModel()).toBe(GROQ_DEFAULT_MODEL);
  });

  it("setting 'groq' does NOT clobber a model the user has already typed", () => {
    setCloudApiProvider("openai-compatible");
    setCloudApiModel("some-custom-model");
    setCloudApiProvider("groq");
    expect(getCloudApiModel()).toBe("some-custom-model");
  });

  it("setting 'openai-compatible' after 'groq' resets URL/model back to the OpenAI defaults (when not customised)", () => {
    setCloudApiProvider("openai-compatible");
    expect(getCloudApiUrl()).toBe("https://api.openai.com/v1/chat/completions");
  });
});

// ─────────────────────────── Groq key validation ───────────────────────────

describe("cloudApi — validateGroqKey", () => {
  it("flags the canonical Groq key prefix as ok", () => {
    const r = validateGroqKey("gsk_abc123def456ghi789jkl012mno345pq");
    expect(r.ok).toBe(true);
    expect(r.hint).toBe("");
  });

  it("flags an OpenAI key prefix as a not-Groq-key warning (does not throw)", () => {
    const r = validateGroqKey("sk-abcd1234efgh5678ijkl9012mnop3456qr");
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/gsk_/i);
    // Not a hard reject — the user might still want to save it.
  });

  it("flags an empty string as not-ok", () => {
    const r = validateGroqKey("");
    expect(r.ok).toBe(false);
    expect(r.hint.length).toBeGreaterThan(0);
  });

  it("flags junk (no prefix) as not-ok but still returnsa useful hint", () => {
    const r = validateGroqKey("notarealkey");
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/gsk_/i);
  });
});

describe("cloudApi — Groq constants", () => {
  it("GROQ_DEFAULT_URL is the v1/chat/completions endpoint", () => {
    expect(GROQ_DEFAULT_URL).toMatch(/^https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions$/);
  });

  it("GROQ_DEFAULT_MODEL is the recommended fast Groq model", () => {
    expect(GROQ_DEFAULT_MODEL).toBe("llama-3.1-8b-instant");
  });

  it("GROQ_RECOMMENDED_MODELS exposes at least the fast + thoughtful Llama-on-Groq options", () => {
    const ids = GROQ_RECOMMENDED_MODELS.map((m) => m.id);
    // Fast + warm opt-ins
    expect(ids).toContain("llama-3.1-8b-instant");
    // 70B variant must be present for the "thoughtful" mirror.
    const has70B = ids.some((id) => id.includes("70b"));
    expect(has70B).toBe(true);
  });

  it("GROQ_KEY_PREFIX documents the live Groq key prefix", () => {
    expect(GROQ_KEY_PREFIX).toBe("gsk_");
  });
});

// ─────────────────────────── Groq wiring end-to-end ───────────────────────────

describe("createCloudBackend — Groq provider", () => {
  it("posts to the Groq endpoint with the user-set model key when provider='groq'", async () => {
    setCloudApiEnabled(true);
    setCloudApiKey("gsk-abc");
    setCloudApiProvider("groq");
    // After provider flip, default URL is Groq + default model is llama-3.1-8b-instant.
    expect(getCloudApiUrl()).toBe(GROQ_DEFAULT_URL);
    fetchMock.mockResolvedValueOnce(fixtureSse(["ok"]));

    const b = createCloudBackend();
    await b.generate({
      system: "You are Nila.",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(GROQ_DEFAULT_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer gsk-abc");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(GROQ_DEFAULT_MODEL); // llama-3.1-8b-instant
    expect(body.stream).toBe(true);
  });

  it("a user-overridden Groq model id is preserved through provider flip", async () => {
    setCloudApiEnabled(true);
    setCloudApiKey("gsk-abc");
    setCloudApiModel("llama-3.3-70b-versatile");
    setCloudApiProvider("groq");
    fetchMock.mockResolvedValueOnce(fixtureSse(["ok"]));

    const b = createCloudBackend();
    await b.generate({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(body.model).toBe("llama-3.3-70b-versatile");
  });
});

// ─── helper: minimal fake SSE response ───────────────────────────────────────
function fixtureSse(tokens: string[]): Response {
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
