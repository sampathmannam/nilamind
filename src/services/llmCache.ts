// llmCache – enclosed LLM reply cache with TTL, in-memory hot tier, and telemetry.
// Uses secureLocal (encrypted-at-rest) for persistence, with an in-memory LRU for instant access.

import { secureLocal } from "./secureLocal";

export interface CachedReply {
  reply: string;
  createdAt: number; // millis since epoch for TTL
}

// Memory cache size — keep a small working set of recent interactions.
const MEMORY_CACHE_LIMIT = 50;
const MEMORY_CACHE = new Map<string, CachedReply>();

// Persistent encrypted storage — capped at MAX_ENTRIES.
const CACHE_INDEX_KEY = "nilamind_llm_cache_index";
const MAX_ENTRIES = 200;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 h — stale replies auto-evicted.

// Telemetry counters (in-memory, never persisted)
let hitCount = 0;
let missCount = 0;
let evictionCount = 0;

// --- Test-only utilities ---
/** Reset all caches and counters — FOR TESTING ONLY */
export function _resetForTest(): void {
  MEMORY_CACHE.clear();
  hitCount = 0;
  missCount = 0;
  evictionCount = 0;
  secureLocal.removeItem(CACHE_INDEX_KEY);
}

// Make internal helpers available for testing
export function _testCacheKey(system: string, messages: { role: string; content: string }[]): string {
  return cacheKey(system, messages);
}

/** Get current cache index keys — TEST ONLY */
export function _testLoadIndex(): string[] {
  return loadIndex();
}

/** Access MAX_ENTRIES constant — TEST ONLY */
export const _testMAX_ENTRIES = MAX_ENTRIES;

/** Access in-memory hot cache — TEST ONLY */
export const _testMEMORY_CACHE = MEMORY_CACHE;


// Periodically log cache stats (development aid — disabled in production via console.debug suppression)
function logStats() {
  console.debug(`LLMCache: hits=${hitCount}, misses=${missCount}, evictions=${evictionCount}, ` +
                `hotSize=${MEMORY_CACHE.size}, diskSize=${loadIndex().length}`);
}

/** Simple 32-bit FNV-1a hash – deterministic, synchronous, no external deps. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // multiply by FNV prime (16777619) — keep uint32
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function cacheKey(system: string, messages: { role: string; content: string }[]): string {
  const payload = JSON.stringify({ system, messages });
  const h = fnv1a(payload).toString(16);
  return `nilamind_llm_cache_${h}`;
}

function loadIndex(): string[] {
  const raw = secureLocal.getItem(CACHE_INDEX_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    console.error("[llmCache] index corrupted, resetting");
    secureLocal.removeItem(CACHE_INDEX_KEY);
    return [];
  }
}

function saveIndex(idx: string[]): void {
  secureLocal.setItem(CACHE_INDEX_KEY, JSON.stringify(idx));
}

// Prune expired entries (TTL) from encrypted storage.
function pruneExpired(): void {
  const now = Date.now();
  const index = loadIndex();
  let updated = false;
  for (const key of index) {
    const entry = secureLocal.getItem(key);
    if (!entry) continue;
    try {
      const cached: CachedReply = JSON.parse(entry);
      if (now - cached.createdAt > TTL_MS) {
        secureLocal.removeItem(key);
        updated = true;
        evictionCount++;
      }
    } catch {
      // invalid JSON — drop
      secureLocal.removeItem(key);
      updated = true;
    }
  }
  if (updated) saveIndex(index.filter((k) => secureLocal.getItem(k) !== null));
}

/** Retrieve a cached reply (exact match on system + messages) or null. */
export function getCachedReply(
  system: string,
  messages: { role: string; content: string }[],
): string | null {
  const key = cacheKey(system, messages);

  // Check hot memory cache — fastest path
  if (MEMORY_CACHE.has(key)) {
    const cached = MEMORY_CACHE.get(key)!;
    if (Date.now() - cached.createdAt <= TTL_MS) {
      hitCount++;
      logStats();
      return cached.reply;
    }
    // Expired in memory cache — drop it
    MEMORY_CACHE.delete(key);
    missCount++;
    logStats();
    // fall through to disk check
  }

  // Check encrypted storage
  const diskValue = secureLocal.getItem(key);
  if (diskValue) {
    missCount++; // Miss in hot cache
    try {
      const cached: CachedReply = JSON.parse(diskValue);
      if (Date.now() - cached.createdAt <= TTL_MS) {
        // Fresh entry → add back to hot cache
        MEMORY_CACHE.delete(key); // age out older entry
        MEMORY_CACHE.set(key, cached);
        // Maintain hot cache size
        while (MEMORY_CACHE.size > MEMORY_CACHE_LIMIT) {
          const oldestKey = MEMORY_CACHE.keys().next().value;
          if (oldestKey !== undefined) MEMORY_CACHE.delete(oldestKey);
        }
        hitCount++;
        logStats();
        return cached.reply;
      }
    // Expired → drop
    secureLocal.removeItem(key);
    const index = loadIndex().filter(k => k !== key);
    saveIndex(index);
    evictionCount++;
    } catch {
      // Corrupted JSON — wipe
      secureLocal.removeItem(key);
    }
  }

  // Cache miss
  missCount++;
  logStats();
  return null;
}

/** Store a reply in cache with write-through to encrypted storage. */
export function setCachedReply(
  system: string,
  messages: { role: string; content: string }[],
  reply: string,
): void {
  const key = cacheKey(system, messages);
  const entry: CachedReply = { reply, createdAt: Date.now() };

  // Write through to hot memory cache
  MEMORY_CACHE.delete(key);
  MEMORY_CACHE.set(key, entry);
  while (MEMORY_CACHE.size > MEMORY_CACHE_LIMIT) {
    const oldestKey = MEMORY_CACHE.keys().next().value;
    if (oldestKey !== undefined) MEMORY_CACHE.delete(oldestKey);
  }

  // Prune expired entries, then write to encrypted storage
  pruneExpired();
  secureLocal.setItem(key, JSON.stringify(entry));

  // Update LRU index
  const index = loadIndex().filter((k) => k !== key);
  index.push(key);
  // Evict oldest if index exceeds MAX_ENTRIES
  while (index.length > MAX_ENTRIES) {
    const oldestKey = index.shift();
    if (oldestKey) {
      secureLocal.removeItem(oldestKey);
      evictionCount++;
    }
  }
  saveIndex(index);
}
