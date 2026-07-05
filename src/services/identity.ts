// Login-free identity (AUTOPILOT Phase 1). No email, no password, no server.
//
// First launch generates a BIP39 12-word recovery phrase. The user's ID is a deterministic hash of
// the seed, so re-entering the same phrase on any device re-derives the SAME ID — that's the entire
// account system. The phrase is the only recovery key; we show it once and store it encrypted at
// rest (via secureLocal → AES-GCM). An optional encrypted backup (keyed by the phrase) lets the user
// move their data to a new device themselves, with no cloud.
//
// @scure/bip39 is an audited, dependency-light implementation (noble/scure). mnemonicToSeedSync is
// deterministic (PBKDF2, fixed salt), so deriveUserId is stable across installs.

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { secureLocal, SENSITIVE_KEYS, flush } from "./secureLocal";

export interface Identity {
  userId: string;
  mnemonic: string;
  createdAt: string;
}

const IDENTITY_KEY = "nilamind_identity";

const enc = new TextEncoder();
const dec = new TextDecoder();
const toHex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const b64 = (u: Uint8Array): string => btoa(String.fromCharCode(...u));
const ub64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const normalize = (m: string): string => m.trim().toLowerCase().replace(/\s+/g, " ");

/** A fresh 12-word (128-bit) recovery phrase. */
export function newMnemonic(): string {
  return generateMnemonic(wordlist, 128);
}

/** Validate a user-entered phrase against the BIP39 wordlist + checksum. */
export function isValidMnemonic(m: string): boolean {
  try {
    return validateMnemonic(normalize(m), wordlist);
  } catch {
    return false;
  }
}

/** Deterministic user ID from the phrase — same phrase always yields the same ID. */
export async function deriveUserId(mnemonic: string): Promise<string> {
  const seed = mnemonicToSeedSync(normalize(mnemonic));
  const digest = await crypto.subtle.digest("SHA-256", seed as unknown as BufferSource);
  return "ma_" + toHex(digest).slice(0, 24);
}

export function loadIdentity(): Identity | null {
  try {
    const raw = secureLocal.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function saveIdentity(id: Identity): void {
  secureLocal.setItem(IDENTITY_KEY, JSON.stringify(id));
}

/** Create + persist an identity from a (new or restored) phrase. */
export async function createIdentity(mnemonic: string): Promise<Identity> {
  const m = normalize(mnemonic);
  const userId = await deriveUserId(m);
  const id: Identity = { userId, mnemonic: m, createdAt: new Date().toISOString() };
  saveIdentity(id);
  return id;
}

/**
 * Return the existing identity, or SILENTLY create one from a fresh phrase if none exists yet.
 *
 * Powers the WEB "talk-first" front door: a first-time visitor in distress is dropped straight into chat
 * instead of being blocked by the 12-word recovery-phrase ceremony before they can say a word. The phrase
 * is still generated and stored (viewable/saveable later in Settings → Your data), so nothing about the
 * no-account, phrase-recoverable privacy model changes — only WHEN the ceremony is asked of them. Idempotent:
 * a returning user's existing identity (and therefore their data key) is never overwritten.
 */
export async function ensureAnonymousIdentity(): Promise<Identity> {
  const existing = loadIdentity();
  if (existing) return existing;
  return createIdentity(newMnemonic());
}

// ── Optional encrypted backup (user-controlled, no cloud) ───────────────────────────────────────
// The backup blob is encrypted with a key derived from the phrase (PBKDF2 over the seed), so it can
// be restored on any device by entering the same phrase. Independent of the device-bound DEK.

// Legacy (v1) backups derived the key from a FIXED salt + 150k iters. New (v2) backups carry a per-backup
// RANDOM salt + a stronger iter count in the blob, so restore reads them back. v1 blobs (no salt field) fall
// back to the legacy constants and still restore — full backward compatibility.
const LEGACY_BACKUP_SALT = "mindanchor-backup-v1";
const LEGACY_BACKUP_ITER = 150_000;
const BACKUP_ITER = 600_000;

async function backupKey(mnemonic: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const seed = mnemonicToSeedSync(normalize(mnemonic));
  const km = await crypto.subtle.importKey("raw", seed as unknown as BufferSource, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: iter, hash: "SHA-256" },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Everything that should travel with the user (managed data keys + identity).
const BACKUP_KEYS = Array.from(new Set([...SENSITIVE_KEYS, IDENTITY_KEY]));

/** Produce a portable, phrase-encrypted backup string of all on-device app data. */
export async function exportBackup(mnemonic: string): Promise<string> {
  const data: Record<string, string> = {};
  for (const k of BACKUP_KEYS) {
    const v = secureLocal.getItem(k);
    if (v != null) data[k] = v;
  }
  const payload = JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), data });
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await backupKey(mnemonic, salt, BACKUP_ITER);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(payload));
  // v:2 carries the per-backup random salt + iter so restore can re-derive the key.
  return btoa(JSON.stringify({ v: 2, salt: b64(salt), iter: BACKUP_ITER, iv: b64(iv), ct: b64(new Uint8Array(ct)) }));
}

/** Restore data from a phrase-encrypted backup string. Returns the number of keys restored.
 *  Throws if the phrase is wrong (AES-GCM auth failure) or the blob is malformed. */
export async function importBackup(blobB64: string, mnemonic: string): Promise<number> {
  const outer = JSON.parse(atob(blobB64.trim()));
  // v2 blobs carry their own salt + iter; legacy v1 blobs (no salt field) use the fixed legacy constants.
  const salt = outer.salt ? ub64(outer.salt) : enc.encode(LEGACY_BACKUP_SALT);
  const iter = typeof outer.iter === "number" ? outer.iter : LEGACY_BACKUP_ITER;
  const key = await backupKey(mnemonic, salt, iter);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub64(outer.iv) }, key, ub64(outer.ct));
  const parsed = JSON.parse(dec.decode(pt));
  let n = 0;
  for (const [k, v] of Object.entries(parsed.data || {})) {
    if (typeof v === "string") {
      secureLocal.setItem(k, v);
      n++;
    }
  }
  // setItem queues fire-and-forget encrypted writes; the caller navigates on immediately (onboarding), so
  // WAIT for them to actually reach IndexedDB before reporting success — else a close/reload right after
  // "restore" silently loses the just-restored data.
  await flush();
  return n;
}
