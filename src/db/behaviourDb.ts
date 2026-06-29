// Local IndexedDB store for daily behaviour snapshots (Dexie, per plan Part 5/7 — NOT localStorage).
// Behaviour data grows one row per day over months; IndexedDB is the right home for it and keeps
// it queryable. Nothing here ever leaves the device.
//
// Encryption-at-rest: screen-time / app-category data is sensitive, so each snapshot is stored
// ENCRYPTED (AES-GCM, via the shared DEK in secureStore) as a { date, enc } row. `date` stays a
// plaintext key so rows remain orderable/queryable; the payload is ciphertext. If crypto isn't
// available (passthrough/locked), we fall back to storing the plaintext snapshot, and reads
// transparently handle both shapes (so legacy plaintext rows from older builds still load).

import Dexie, { type Table } from 'dexie';
import type { BehaviourSnapshot } from '../services/phoneBehaviour';
import { encryptValue, decryptValue, isUnlocked, type EncBlob } from '../services/secureStore';

// A row is either an encrypted envelope or (legacy / passthrough) a raw snapshot.
type Row = { date: string; enc: EncBlob } | BehaviourSnapshot;

class BehaviourDB extends Dexie {
  daily!: Table<Row, string>; // keyed by `date` (YYYY-MM-DD)

  constructor() {
    super('nilamind_behaviour');
    this.version(1).stores({ daily: 'date' });
  }
}

export const behaviourDb = new BehaviourDB();

function isEnvelope(row: Row): row is { date: string; enc: EncBlob } {
  return !!row && typeof (row as any).enc === 'object' && (row as any).enc?.ct !== undefined;
}

async function toRow(snapshot: BehaviourSnapshot): Promise<Row> {
  if (!isUnlocked()) return snapshot; // crypto unavailable → store plaintext (fail-safe)
  try {
    const enc = await encryptValue(JSON.stringify(snapshot));
    return { date: snapshot.date, enc };
  } catch {
    return snapshot;
  }
}

async function fromRow(row: Row | undefined): Promise<BehaviourSnapshot | undefined> {
  if (!row) return undefined;
  if (!isEnvelope(row)) return row; // legacy plaintext snapshot
  try {
    return JSON.parse(await decryptValue(row.enc)) as BehaviourSnapshot;
  } catch {
    return undefined; // can't decrypt (e.g. locked) → skip rather than crash
  }
}

/** Upsert today's (or any day's) snapshot — one row per date. */
export async function saveSnapshot(snapshot: BehaviourSnapshot): Promise<void> {
  await behaviourDb.daily.put(await toRow(snapshot));
}

export async function getSnapshot(date: string): Promise<BehaviourSnapshot | undefined> {
  return fromRow(await behaviourDb.daily.get(date));
}

/** Most recent N days, oldest-first (handy for charts). */
export async function getRecentSnapshots(days = 30): Promise<BehaviourSnapshot[]> {
  const newestFirst = await behaviourDb.daily.orderBy('date').reverse().limit(days).toArray();
  const decrypted = await Promise.all(newestFirst.map((r) => fromRow(r)));
  return decrypted.filter((s): s is BehaviourSnapshot => !!s).reverse();
}

export async function getAllSnapshots(): Promise<BehaviourSnapshot[]> {
  const rows = await behaviourDb.daily.orderBy('date').toArray();
  const decrypted = await Promise.all(rows.map((r) => fromRow(r)));
  return decrypted.filter((s): s is BehaviourSnapshot => !!s);
}

/** Wipe all behaviour history (exposed in Settings → full user control, plan Part 11.4). */
export async function clearBehaviourData(): Promise<void> {
  await behaviourDb.daily.clear();
}
