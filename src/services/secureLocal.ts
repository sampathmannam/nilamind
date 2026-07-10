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
import { ls } from "./storageUtils";

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
  // Active Nila conversation — persisted so the chat survives leaving the app (encrypted at rest, see sessionChat.ts).
  "nilamind_session_chat",
  // Active structured-protocol position — {protocolId, stepIndex}, persisted so a program resumes (see protocolProgress.ts).
  "nilamind_protocol_progress",
  // EMA micro-check-in log — mood valence/energy + the free-text note (encrypted at rest, see ema.ts).
  "nilamind_ema",
];
const MIGRATION_VERSION = 2; // v2: encrypt nilamind_ema (previously stored in plaintext localStorage)

const cache = new Map<string, string>();
let hydrated = false;
let passthrough = false;
let persistChain: Promise<void> = Promise.resolve();

// A queued encrypted write can fail (DEK unavailable, IndexedDB quota/error) AFTER setItem already returned and
// updated the cache — so without this the failure is SILENT and the write is lost on next boot. We record the
// failing keys, notify listeners (so the UI can warn "couldn't save your changes"), and retry them on flush().
// The data always survives in `cache` for the session regardless.
const pendingFailures = new Map<string, string>();
const persistListeners = new Set<(failingKeys: string[]) => void>();

/** Subscribe to persist-failure changes; called with the keys whose last write didn't reach disk. Returns unsub. */
export function onPersistError(cb: (failingKeys: string[]) => void): () => void {
  persistListeners.add(cb);
  return () => { persistListeners.delete(cb); };
}
/** Keys whose last encrypted write failed to reach disk (still safe in the in-memory cache; retried on flush). */
export function pendingWriteFailures(): string[] {
  return [...pendingFailures.keys()];
}
function notifyPersistListeners(): void {
  const keys = [...pendingFailures.keys()];
  for (const cb of [...persistListeners]) { // snapshot: a listener may unsubscribe (mutate the Set) mid-notify
    try { cb(keys); } catch (e) { console.error("secureLocal persist listener threw"); }
  }
}

/** Queue an encrypted write without blocking the synchronous caller. */
function queuePersist(key: string, value: string) {
  persistChain = persistChain
    .then(() => encryptValue(value))
    .then((blob) => kvPut(key, blob))
    .then(() => {
      if (pendingFailures.delete(key)) notifyPersistListeners(); // reached disk — clear any prior failure
    })
    .catch((e) => {
      console.error("secureLocal persist failed");
      pendingFailures.set(key, value); // NOT silent: record it (data is still safe in cache) so flush can retry
      notifyPersistListeners();
    });
}
function queueDelete(key: string) {
  persistChain = persistChain.then(() => kvDel(key)).catch((e) => console.error("secureLocal delete failed"));
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
          console.error("secureLocal migration verify mismatch, keeping plaintext");
        }
      } catch (e) {
        console.error("secureLocal migration failed, keeping plaintext");
      }
    }
  }
  await setMigratedVersion(MIGRATION_VERSION);
}

/** Boot the secure store and hydrate the in-memory cache. Call once before rendering data screens.
 *  Returns the mode so the UI can decide whether to show a PIN unlock screen. */
export async function bootSecure(): Promise<{ mode: "device" | "pin"; unlocked: boolean; error?: "encrypted_unavailable" }> {
  try {
    const res = await initSecure();
    if (res.mode === "pin" && !res.unlocked) return res; // caller must unlock first
    await hydrate();
    return res;
  } catch (e) {
    console.error("secureLocal boot failed");
    // If the user ALREADY migrated to the encrypted store, their real data is in IndexedDB and UNREADABLE
    // without the key — and migration removed the plaintext copies, so localStorage is empty for those keys.
    // Silently entering passthrough would then (a) show an empty app and (b) shadow-write sensitive data into
    // plaintext. Recovery is impossible without the key, so signal locked-out — the UI shows an honest
    // "couldn't open your data — retry" screen (SecureGate) instead of a blank safety plan. If NOT migrated,
    // plaintext still holds the data, so passthrough is genuinely safe (recover it as before).
    // Lock-out decision hinges on "plaintext was already removed", which is true for ANY prior migration
    // (>=1) — NOT on being at the latest schema. Using >= MIGRATION_VERSION would misclassify a v1-migrated
    // user as never-migrated after a version bump and shadow-write their data back to plaintext (audit #5).
    let migrated = false;
    try { migrated = migratedVersion() >= 1; } catch { migrated = false; }
    if (migrated) {
      return { mode: "device", unlocked: false, error: "encrypted_unavailable" };
    }
    hydrateFromPlaintext(); // not-migrated path: recover existing plaintext so screens don't render empty
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
      console.error("secureLocal failed to decrypt a stored key");
    }
  }
  await migrate();
  hydrated = true;
}

/** When crypto/IndexedDB init fails, the app must still show the user's existing data — otherwise the
 *  safety plan, diary, etc. render empty. Read any plaintext sensitive keys already in localStorage into
 *  the in-memory cache before we declare passthrough mode. Per-key try/catch so one corrupt key can't
 *  hide the rest. */
function hydrateFromPlaintext(): void {
  const store = ls();
  if (!store) return;
  for (const key of SENSITIVE_KEYS) {
    try {
      const plain = store.getItem(key);
      if (plain !== null && !cache.has(key)) cache.set(key, plain);
    } catch (e) {
      console.error("[secureLocal] hydrateFromPlaintext read failed:", e);
    }
  }
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

/** Atomic append to a JSON-array-valued key: read → corrupt-safe parse → push → write, all SYNCHRONOUSLY
 *  (no await inside), so two callers from different async contexts can't interleave a stale read-modify-write
 *  and drop an entry (the last-writer-wins race, 2026-07-06 audit). Optional `cap` keeps only the most recent N.
 *  Returns the new array. Use this instead of hand-rolling getItem→JSON.parse→push→setItem at each call site. */
export function appendToSecureArray<T>(key: string, item: T, cap?: number): T[] {
  let arr: T[];
  try {
    const raw = secureLocal.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    arr = Array.isArray(parsed) ? parsed : [];
  } catch {
    arr = [];
  }
  arr.push(item);
  if (cap && arr.length > cap) arr = arr.slice(arr.length - cap);
  secureLocal.setItem(key, JSON.stringify(arr));
  return arr;
}

/** Await all queued encrypted writes (used on pagehide and in tests). Also RETRIES any writes that previously
 *  failed — a failure may have been transient (IDB busy) or resolved (store re-unlocked), so a flush is our
 *  chance to get the data to disk before the app closes. */
let retrying = false; // re-entry guard: concurrent flushes (pagehide + importBackup) must not double-queue retries
export async function flush(): Promise<void> {
  await persistChain;
  if (pendingFailures.size && !retrying) {
    retrying = true; // held across the await so a concurrent flush skips the retry instead of double-queuing
    try {
      // Retry with the CURRENT cache value, never the value captured at failure time — otherwise a retry could
      // land AFTER a newer setItem on the FIFO persistChain and overwrite the newest write with stale data.
      for (const k of [...pendingFailures.keys()]) {
        const v = cache.get(k);
        if (v === undefined) pendingFailures.delete(k); // removed since the failure — nothing to persist
        else queuePersist(k, v);
      }
      await persistChain;
    } finally {
      retrying = false;
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    void flush();
  });
  // AUDIT 2026-07-06 #11: `pagehide` is NOT reliably fired by the Android WebView when the OS kills a
  // backgrounded process — so a queued encrypted write (the newest chat turn / safety-plan edit) could be lost
  // on a hard kill. `visibilitychange → hidden` DOES fire the moment the app is backgrounded (the window before
  // a kill), so flushing there gets the latest write to disk while the process is still alive. Idempotent with
  // the pagehide flush (flush() awaits the same chain).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  // Periodic flush every 30s to catch any pending writes in case of unexpected process termination
  const FLUSH_INTERVAL_MS = 30_000;
  setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);
}
