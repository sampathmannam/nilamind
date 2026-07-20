// src/services/dashboardNarrative.ts
// Phase 4: LLM-enhanced narrative summaries for the dashboard bands. The static buildBandNarratives()
// string is always the synchronous, offline-safe gist. When the on-device model is ready, this module
// asks Nila to rewrite that gist into a warmer, single sentence — but it ONLY ENHANCES; the static
// string stays on screen until/unless the model returns something, and every model output passes the
// §9 output gate (applyOutputSafety) before it can be shown. The model is never given free-text the
// user typed — only derived counts/words — so this can't leak private content it wasn't already given.

import { buildBandNarratives, type BandNarrativeInput } from "./bandNarratives";
import { isLocalLlmReady, generateOnDevice } from "./localLlm";
import { applyOutputSafety } from "./nilaSafetyGate";

const NARRATIVE_SYSTEM =
  "You are Nila, a privacy-first wellness companion. Write a SINGLE short, warm, non-clinical sentence " +
  "(max 25 words) for the person to read on their private dashboard. Facts only. Never give medical, " +
  "therapy, diagnostic, or crisis advice. Never mention suicide, self-harm, or methods. If there is " +
  "little data, say something gentle and encouraging.";

// The on-device model is a shared, battery/CPU-expensive resource. Tab switches remount the dashboard,
// so cache the last safe upgrade per (moodSummary|lang) for a short window and reuse it instead of
// re-invoking the model on every mount. Safety-gated output is cached, never raw model text.
const NARRATIVE_CACHE_TTL_MS = 10 * 60 * 1000;
const narrativeCache = new Map<string, { text: string; at: number }>();

function narrativeCacheKey(i: BandNarrativeInput): string {
  return `${i.lang}::${i.moodSummary}`;
}

function cachedNarrative(i: BandNarrativeInput): string | null {
  const hit = narrativeCache.get(narrativeCacheKey(i));
  if (hit && Date.now() - hit.at < NARRATIVE_CACHE_TTL_MS) return hit.text;
  return null;
}

function storeNarrative(i: BandNarrativeInput, text: string): void {
  narrativeCache.set(narrativeCacheKey(i), { text, at: Date.now() });
}

/** Test-only: clear the cross-mount narrative cache so each test sees fresh model behavior. */
export function __clearNarrativeCache(): void {
  narrativeCache.clear();
}

function buildNarrativeUserPrompt(i: BandNarrativeInput): string {
  const parts: string[] = [];
  if (i.monthlyWord) parts.push(`This month has felt ${i.monthlyWord}.`);
  if (i.behaviourCount + i.proactiveCount > 0) {
    parts.push(`Nila noticed ${i.behaviourCount + i.proactiveCount} pattern(s).`);
  }
  if (i.signalCount > 0) parts.push(`${i.signalCount} background signal(s) tracked.`);
  if (i.episodeCount > 0) parts.push(`${i.episodeCount} episode(s) on record.`);
  parts.push(i.moodSummary || "No recent mood data.");
  return "Summarize this wellness week in one calm sentence: " + parts.join(" ");
}

/**
 * Enhanced narrative for the dashboard. Returns the static, always-safe gist by default. When the
 * on-device model is ready it upgrades the text via a bounded, safety-gated generation; if the model
 * is busy/unavailable/unsafe it falls back to the static string. Never returns empty.
 */
export async function generateDashboardNarrative(i: BandNarrativeInput): Promise<string> {
  const fallback = buildBandNarratives(i).trends || i.moodSummary;
  // The on-device model speaks English; only upgrade when the UI language is English so we never
  // surface an out-of-language sentence. Non-English locales keep the localized static gist.
  if (i.lang !== "en") return fallback;
  if (!isLocalLlmReady()) return fallback;
  // Reuse a recent safe upgrade instead of re-invoking the model on every mount/tab-switch.
  const cached = cachedNarrative(i);
  if (cached) return cached;
  try {
    const reply = await generateOnDevice(
      NARRATIVE_SYSTEM,
      [{ role: "user", content: buildNarrativeUserPrompt(i) }],
      () => {},
      undefined,
      { wait: false },
    );
    if (!reply) return fallback;
    const safe = applyOutputSafety(reply, "", true, false);
    const trimmed = safe.replace(/\s+/g, " ").trim();
    // Bounds: a narrative strip is one short sentence. Reject anything that looks like a dump.
    if (trimmed.length === 0 || trimmed.length > 160) return fallback;
    storeNarrative(i, trimmed);
    return trimmed;
  } catch {
    return fallback;
  }
}
