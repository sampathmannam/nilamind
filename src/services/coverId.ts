// src/services/coverId.ts
// BIP39-derived pseudonymous cover ID for the clinician PDF. Three memorable words
// that identify the patient without using their real name. Generated once per device,
// encrypted at rest via secureLocal.
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { secureLocal } from "./secureLocal";

const COVER_ID_KEY = "nilamind_cover_id";
const WORD_COUNT = 3;

/**
 * Derive a pseudonymous cover ID from a random seed. Uses the BIP39 English
 * wordlist (2048 words) — three words give ~33 bits of entropy, more than
 * sufficient for a pseudonymous label that a clinician can use to distinguish
 * patients without learning their real names.
 */
function deriveCoverId(seed: Uint8Array): string {
  const words: string[] = [];
  for (let i = 0; i < WORD_COUNT; i++) {
    // Each word needs 11 bits (2^11 = 2048). Use two bytes per word,
    // masking to 11 bits.
    const idx = ((seed[i * 2] << 8) | seed[i * 2 + 1]) & 0x7ff;
    words.push(wordlist[idx]);
  }
  return words.join("-");
}

/** Load or generate the device's cover ID. Idempotent — returns the same ID across calls. */
export function getCoverId(): string {
  const existing = secureLocal.getItem(COVER_ID_KEY);
  if (existing && typeof existing === "string" && existing.includes("-")) {
    return existing;
  }
  const seed = new Uint8Array(WORD_COUNT * 2);
  crypto.getRandomValues(seed);
  const id = deriveCoverId(seed);
  secureLocal.setItem(COVER_ID_KEY, id);
  return id;
}
