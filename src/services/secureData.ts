// secureData — typed, corrupt-safe JSON readers layered over secureLocal.
//
// DELIBERATELY a SEPARATE module from secureLocal.ts (re-architecture Phase 1, 2026-07-18). secureLocal's
// export surface is effectively frozen: ~98 test files replace the whole module with `vi.mock` factories
// that expose only { secureLocal, appendToSecureArray, … } — so ANY new export added there is `undefined`
// in every mocked test graph. Living here, secureData is never mocked, and its real implementation runs
// over whatever `secureLocal` (real or a test's mock) the importer sees — exactly the mechanism that lets
// checkin.loadCheckins survive the mocks today, just lifted one module up. This is also the correct
// layering independent of tests: typed JSON read policy is a different concern from the storage-engine
// facade (cache / persistChain / migration / flush).
//
// READS + WRITES (Phase 1 write half, 2026-07-18). Both directions go through the SAME secureLocal leaf
// (getItem / setItem) that the ~98 vi.mock("./secureLocal") factories stub — so writers survive the mocks
// exactly like the readers do. We deliberately do NOT wrap secureLocal.appendToSecureArray here: that
// primitive lives in the frozen module with its own intra-module cache bindings and stays the canonical
// APPEND path; secureData owns the authoritative-overwrite and read-modify-write paths.
//
// CORRUPT-BLOB POLICY differs by intent, on purpose:
//   - readers + append: corrupt/absent → treat as empty (append adds data; dropping an unreadable blob to
//     keep the new item is the lesser evil, and matches appendToSecureArray's shipped behaviour).
//   - updateSecure* (read-modify-WRITE): a present-but-unparseable blob → BAIL (return null, write nothing).
//     A corrupt-safe reader that silently returns []/{} feeding a naive rewrite would WIPE recoverable data.
//     This is the one place the read layer's safety would become a write hazard, so mutations refuse it.

import { secureLocal } from "./secureLocal";

/** Canonical storage keys owned by the typed data layer — the single source of truth for both the readers
 *  above and the writers below. Domain modules should reference these, never re-spell the literal, so a key
 *  can never drift between a writer and its reader (the phantom-key / delete-no-op bug class). */
export const SECURE_KEYS = {
  checkins: "nilamind_checkins",
  journal: "nilamind_journal",
  diary: "nilamind_diary",
  assessments: "nilamind_assessments",
  baActivities: "nilamind_ba_activities",
  episodeMarkers: "nilamind_episode_markers",
  episodes: "nilamind_episodes",
  thoughtRecords: "nilamind_thought_records",
} as const;

/** All items at an array-valued key. Never throws; returns [] on a missing key, an unparseable blob, or a
 *  non-array value. The one place the try/parse/Array.isArray guard lives, so domain readers are one line
 *  (e.g. `loadCheckins = () => loadSecureArray<CheckInEntry>("nilamind_checkins")`). */
export function loadSecureArray<T>(key: string): T[] {
  try {
    const raw = secureLocal.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** A Record-map at an object-valued key (e.g. the DBT diary keyed by date). Never throws; returns {} on a
 *  missing key, an unparseable blob, or a non-object / array-shaped value. Domains that need field-level
 *  recovery or defaults-merging (the safety plan → parseSafetyPlan) keep their own richer parser. */
export function loadSecureRecord<V>(key: string): Record<string, V> {
  try {
    const raw = secureLocal.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, V>)
      : {};
  } catch {
    return {};
  }
}

/** Authoritative overwrite of an array-valued key. Use when the caller already holds the full, correct
 *  array (the mirror of loadSecureArray). Serialises exactly as the readers expect — no envelope. */
export function writeSecureArray<T>(key: string, arr: readonly T[]): void {
  secureLocal.setItem(key, JSON.stringify(arr));
}

/** Authoritative overwrite of a Record-map key (the mirror of loadSecureRecord). */
export function writeSecureRecord<V>(key: string, map: Record<string, V>): void {
  secureLocal.setItem(key, JSON.stringify(map));
}

/** Read-modify-write for an array-valued key. Reads the current array, applies `mutate`, writes the result.
 *  BAILS (returns null, writes nothing) if the key holds a present-but-unparseable / non-array blob, so a
 *  mutation can never wipe recoverable data. An absent/empty key is treated as [] (safe to initialise). */
export function updateSecureArray<T>(key: string, mutate: (arr: T[]) => T[]): T[] | null {
  const raw = secureLocal.getItem(key);
  let arr: T[];
  if (raw == null || raw === "") {
    arr = [];
  } else {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      arr = parsed as T[];
    } catch {
      return null;
    }
  }
  const next = mutate(arr);
  secureLocal.setItem(key, JSON.stringify(next));
  return next;
}

/** Read-modify-write for a Record-map key. Same bail-on-corrupt guarantee as updateSecureArray: a present
 *  but unparseable / array-shaped / null blob → returns null and writes nothing (never wipes the map). */
export function updateSecureRecord<V>(
  key: string,
  mutate: (map: Record<string, V>) => Record<string, V>,
): Record<string, V> | null {
  const raw = secureLocal.getItem(key);
  let map: Record<string, V>;
  if (raw == null || raw === "") {
    map = {};
  } else {
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      map = parsed as Record<string, V>;
    } catch {
      return null;
    }
  }
  const next = mutate(map);
  secureLocal.setItem(key, JSON.stringify(next));
  return next;
}
