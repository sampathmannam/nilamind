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
// READ-SIDE ONLY. Writes stay on secureLocal.setItem / appendToSecureArray (which some tests stub) —
// routing writes through here would fight those mocks and mix intra-module bindings.

import { secureLocal } from "./secureLocal";

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
