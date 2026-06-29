// secureLocal — a synchronous, localStorage-shaped facade over encrypted-at-rest storage.
//
// The app has ~47 synchronous `localStorage.getItem/setItem` call sites. Web Crypto is async, so
// rather than rewrite every call site into async/await (huge blast radius), we keep a decrypted
// in-memory cache that is hydrated from encrypted IndexedDB once at boot, expose the same sync API,
// and persist writes back to IndexedDB encrypted (fire-and-forget, with a flush on pagehide).
// Plaintext lives only in memory; ciphertext lives at rest. This is a standard, sound
// "encryption-at-rest" shape for a single-user local SPA.
//
// FAIL-SAFE: if crypto/IndexedDB is unavailable (e.g. private mode, or init failed), we fall back to
// PASSTHROUGH mode backed by plain window.localStorage. The app must NEVER become unusable — losing
// access to a safety plan because crypto broke would be worse than the (then-unchanged) status quo.

import {
  initSecure,
  isUnlocked,
  encryptValue,
  decryptValue,
  kvGetAll,
  kvPut,
  kvDel,
  migratedVersion,
  setMigratedVersion,
} from "./secureStore";

// Sensitive keys that must be encrypted + migrated out of plaintext localStorage.
// NOTE: "nilamind_disable_pulse" is intentionally NOT here — it's a non-sensitive UI preference
// and stays in plain localStorage (read at boot, before the gate, with no privacy cost).
export const SENSITIVE_KEYS = [
  "nilamind_checkins",
  "nilamind_diary",
  "nilamind_episodes",
  "nilamind_thought_records",
  "nilamind_safetyplan",
  "nilamind_critic_logs",
  "nilamind_compassionate_letters",
  "nilamind_shame_protect_logs",
  "nilamind_assessments",
  "nilamind_values",
  "nilamind_values_actions",
  "nilamind_ba_activities",
  "nilamind_home_coords",
  "nilamind_nila_sessions",
  "nilamind_nila_memory",
  "nilamind_identity",
  // Phase 1 compounding memory — durable insights + their tombstones (encrypted at rest).
  "nilamind_nila_insights",
  "nilamind_nila_insights_removed",
  // Phase 2 inflection-awareness — private observation log + acks (encrypted at rest).
  "nilamind_inflection",
  // Profile memory — user-owned Core facts + Active focus tiers (encrypted at rest).
  "nilamind_profile_facts",
  "nilamind_active_focus",
  // On-device model feedback / improvement signals (encrypted at rest).
  "nilamind_feedback",
  // Consented donation queue — scrubbed reply+suggestion the person chose to contribute (encrypted at rest).
  "nilamind_donations",
];
const MIGRATION_VERSION = 1;

const cache = new Map<string, string>();
let hydrated = false;
let passthrough = false;
let persistChain: Promise<void> = Promise.resolve();

const ls = (): Storage | null => {
  try {
    return (globalThis as any).localStorage ?? null;
  } catch {
    return null;
  }
};

/** Queue an encrypted write without blocking the synchronous caller. */
function queuePersist(key: string, value: string) {
  persistChain = persistChain
    .then(() => encryptValue(value))
    .then((blob) => kvPut(key, blob))
    .catch((e) => console.error("secureLocal persist failed:", key, e));
}
function queueDelete(key: string) {
  persistChain = persistChain.then(() => kvDel(key)).catch((e) => console.error("secureLocal delete failed:", key, e));
}

/** Move any plaintext sensitive keys into the encrypted store, verifying each round-trip BEFORE
 *  deleting the plaintext. Per-key so a single failure never cascades into data loss. */
async function migrate(): Promise<void> {
  if (migratedVersion() >= MIGRATION_VERSION) {
    // Still sweep up any stray plaintext copies that were already migrated.
    const store = ls();
    if (store) for (const key of SENSITIVE_KEYS) if (cache.has(key) && store.getItem(key) !== null) store.removeItem(key);
    return;
  }
  const store = ls();
  if (store) {
    for (const key of SENSITIVE_KEYS) {
      if (cache.has(key)) continue; // already in encrypted store
      const plain = store.getItem(key);
      if (plain === null) continue;
      try {
        const blob = await encryptValue(plain);
        await kvPut(key, blob);
        const verify = await decryptValue(blob);
        if (verify === plain) {
          cache.set(key, plain);
          store.removeItem(key); // only drop plaintext after a verified encrypted round-trip
        } else {
          console.error("secureLocal migration verify mismatch, keeping plaintext:", key);
        }
      } catch (e) {
        console.error("secureLocal migration failed, keeping plaintext:", key, e);
      }
    }
  }
  await setMigratedVersion(MIGRATION_VERSION);
}

/** Boot the secure store and hydrate the in-memory cache. Call once before rendering data screens.
 *  Returns the mode so the UI can decide whether to show a PIN unlock screen. */
export async function bootSecure(): Promise<{ mode: "device" | "pin"; unlocked: boolean }> {
  try {
    const res = await initSecure();
    if (res.mode === "pin" && !res.unlocked) return res; // caller must unlock first
    await hydrate();
    return res;
  } catch (e) {
    console.error("secureLocal boot failed — falling back to plaintext localStorage:", e);
    enablePassthrough();
    return { mode: "device", unlocked: true };
  }
}

/** Hydrate the cache from encrypted IndexedDB (assumes the store is unlocked). */
export async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (!isUnlocked()) throw new Error("cannot hydrate while locked");
  const all = await kvGetAll();
  for (const [key, blob] of Object.entries(all)) {
    try {
      cache.set(key, await decryptValue(blob));
    } catch (e) {
      console.error("secureLocal failed to decrypt key:", key, e);
    }
  }
  await migrate();
  hydrated = true;
}

function enablePassthrough() {
  passthrough = true;
  hydrated = true;
}
export function isPassthrough(): boolean {
  return passthrough;
}

// ── synchronous localStorage-shaped API ──
export const secureLocal = {
  getItem(key: string): string | null {
    if (passthrough) return ls()?.getItem(key) ?? null;
    return cache.has(key) ? (cache.get(key) as string) : null;
  },
  setItem(key: string, value: string): void {
    if (passthrough) {
      ls()?.setItem(key, value);
      return;
    }
    cache.set(key, value);
    queuePersist(key, value);
  },
  removeItem(key: string): void {
    if (passthrough) {
      ls()?.removeItem(key);
      return;
    }
    cache.delete(key);
    queueDelete(key);
  },
};

/** Await all queued encrypted writes (used on pagehide and in tests). */
export async function flush(): Promise<void> {
  await persistChain;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    void flush();
  });
}
