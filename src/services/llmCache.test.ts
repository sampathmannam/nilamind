// llmCache.test.ts — unit tests for the deterministic LLM reply cache.

import { getCachedReply, setCachedReply, _resetForTest, _testCacheKey, _testMAX_ENTRIES, _testMEMORY_CACHE } from "./llmCache";
import { secureLocal } from "./secureLocal";
import { describe, expect, test, vi, beforeEach } from "vitest";

describe("LLMCache", () => {
  // Time mocks
  vi.spyOn(Date, "now").mockImplementation(() => 1000);

  beforeEach(() => {
    _resetForTest(); // Reset all caches
    vi.clearAllMocks();
  });

  test("getCachedReply returns null for first lookup", () => {
    expect(getCachedReply("system", [])).toBeNull();
  });

  test("getCachedReply returns stored reply for identical input", () => {
    setCachedReply("system", [], "hello world");
    expect(getCachedReply("system", [])).toBe("hello world");
  });

  test("getCachedReply distinguishes prompts", () => {
    setCachedReply("system1", [], "first");
    setCachedReply("system2", [], "second");
    expect(getCachedReply("system1", [])).toBe("first");
    expect(getCachedReply("system2", [])).toBe("second");
  });

  test("getCachedReply returns replies for same-system different-messages", () => {
    setCachedReply("system", [{ role: "user", content: "first" }], "reply1");
    setCachedReply("system", [{ role: "user", content: "second" }], "reply2");
    expect(getCachedReply("system", [{ role: "user", content: "first" }])).toBe("reply1");
    expect(getCachedReply("system", [{ role: "user", content: "second" }])).toBe("reply2");
  });

  test("getCachedReply returns null after TTL expiration", () => {
    vi.spyOn(Date, "now").mockImplementation(() => 1000);
    setCachedReply("system", [], "hello");
    vi.spyOn(Date, "now").mockImplementation(() => 1000 + 24 * 60 * 60 * 1000 + 1); // 24 h + 1 ms
    expect(getCachedReply("system", [])).toBeNull();
  });

  test("getCachedReply returns fresh entries before TTL expiration", () => {
    vi.spyOn(Date, "now").mockImplementation(() => 1000);
    setCachedReply("system", [], "hello");
    vi.spyOn(Date, "now").mockImplementation(() => 1000 + 23 * 60 * 60 * 1000); // 23 h
    expect(getCachedReply("system", [])).toBe("hello");
  });

test("setCachedReply evicts oldest entry when MAX_ENTRIES exceeded", () => {
    // Pre-populate index with MAX_ENTRIES entries (already at limit)
    const existingKeys = Array.from({ length: _testMAX_ENTRIES }, (_, i) => `nilamind_llm_cache_key_${i}`);
    secureLocal.setItem("nilamind_llm_cache_index", JSON.stringify(existingKeys));
    for (const key of existingKeys) {
      secureLocal.setItem(key, JSON.stringify({ reply: "old", createdAt: Date.now() }));
    }

    // Store one more entry - should trigger eviction of oldest
    setCachedReply("new_system", [], "new_reply");
    // Verify oldest key removed from index
    const index = JSON.parse(secureLocal.getItem("nilamind_llm_cache_index")!);
    expect(index.length).toBe(_testMAX_ENTRIES);
    // First key should be the second entry (oldest evicted)
    expect(index[0]).toMatch(/nilamind_llm_cache_key_1/);
  });

  test("getCachedReply prefers memory cache for hot entries", () => {
    // Compute key
    const key = _testCacheKey("system", []);
    // Bypass public API to mock memory cache
    _testMEMORY_CACHE.set(key, { reply: "hot_reply", createdAt: Date.now() });
    expect(getCachedReply("system", [])).toBe("hot_reply");
  });
});

// Use _testCacheKey for assertions where needed
const cacheKey = _testCacheKey;
