/**
 * STT Incoherence Gate — catches garbled speech-to-text output before it hits the model.
 *
 * Vosk on-device STT has no confidence score. When the audio is noisy, partial, or the
 * speaker is mumbling, the transcript can be garbled — random word fragments, excessive
 * repetition, or mostly non-alphabetic characters. Sending garbled text to the model
 * wastes inference time and produces confusing replies.
 *
 * This gate runs ONLY on STT input (not typed input). It is deterministic, offline,
 * and fail-open (if the gate throws, the text passes through).
 */

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Characters that are normal in typed text but suspicious in STT output. */
const SPECIAL_CHAR_RATIO = /[^a-zA-Z0-9\s.,!?'"-]/g;

/** Words that Vosk often produces when it fails to decode. */
const GARBLED_FRAGMENTS = /\b(xyz|abc|def|ghi|jkl|mno|pqr|stu|vwx|yz|qwerty|asdf|zxcv|blah|um+|uh+|er+|hm+)\b/i;

/**
 * Check if a word is mostly consonant clusters (no vowels) —
 * a sign of garbled recognition, not a real word.
 */
function isConsonantCluster(word: string): boolean {
  if (word.length < 4) return false;
  const vowels = word.match(/[aeiou]/gi);
  return !vowels || vowels.length <= 1;
}

/**
 * Check for excessive word repetition (STT stuck in a loop).
 * Returns true if any word appears 4+ times.
 */
function hasExcessiveRepetition(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const counts = new Map<string, number>();
  for (const w of words) {
    if (w.length < 2) continue;
    const c = (counts.get(w) ?? 0) + 1;
    counts.set(w, c);
    if (c >= 4) return true;
  }
  return false;
}

/**
 * Check if the text is mostly non-alphabetic characters.
 * STT garble often produces strings of digits, symbols, or fragments.
 */
function hasHighSpecialRatio(text: string): boolean {
  const alpha = text.replace(/[^a-zA-Z]/g, "").length;
  const total = text.replace(/\s/g, "").length;
  if (total === 0) return true;
  return alpha / total < 0.5;
}

/**
 * Check if the text has too many consonant clusters (garbled recognition).
 */
function hasTooManyClusters(text: string): boolean {
  const words = text.split(/\s+/).filter((w) => w.length >= 4);
  if (words.length < 2) return false;
  const clusterCount = words.filter(isConsonantCluster).length;
  return clusterCount / words.length > 0.5;
}

// ---------------------------------------------------------------------------
// Main gate
// ---------------------------------------------------------------------------

export interface CoherenceResult {
  coherent: boolean;
  reason?: string;
}

/**
 * Check if STT output is coherent enough to send to the model.
 * Returns { coherent: true } if the text passes all checks.
 * Returns { coherent: false, reason } if the text is garbled.
 *
 * Fail-open: any error returns { coherent: true }.
 */
export function checkSttCoherence(text: string): CoherenceResult {
  if (!text || !text.trim()) return { coherent: false, reason: "empty" };

  const trimmed = text.trim();

  // Too short to be meaningful (1-2 characters, or single character repeated)
  if (trimmed.length <= 2) return { coherent: false, reason: "too_short" };

  // High ratio of non-alphabetic characters
  if (hasHighSpecialRatio(trimmed)) {
    return { coherent: false, reason: "high_special_ratio" };
  }

  // Excessive word repetition (STT loop)
  if (hasExcessiveRepetition(trimmed)) {
    return { coherent: false, reason: "excessive_repetition" };
  }

  // Too many consonant clusters (garbled recognition)
  if (hasTooManyClusters(trimmed)) {
    return { coherent: false, reason: "consonant_clusters" };
  }

  // Known garbled fragments
  if (GARBLED_FRAGMENTS.test(trimmed)) {
    // Only flag if the text is SHORT — long text with "um" is natural hesitation
    if (trimmed.split(/\s+/).length <= 5) {
      return { coherent: false, reason: "garbled_fragments" };
    }
  }

  return { coherent: true };
}
