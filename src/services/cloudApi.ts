// Optional cloud API tier — lets users bring their own API key for a cloud model.
// DEFAULT is on-device only; cloud is opt-in. Privacy: user must explicitly enter their key
// and understand that messages leave the device. This module stores the preference + key.
// The key is kept in localStorage (not secureLocal) — same as a browser password manager.
//
// Provider model (2026-07-16 — GROQ support): the user picks a "provider" preset (Groq by
// default), which controls the OpenAI-compatible URL and the recommended-model dropdown so
// they don't have to copy-paste endpoints. They can still override URL/model with the
// "Custom (OpenAI-compatible)" provider for Together / Fireworks / self-hosted etc. The
// adapter itself (cloudLlmAdapter.ts) is provider-agnostic — it posts OpenAI chat-completion
// shape and lets the URL/model pair do the routing.

// ─── Provider preset constants ───────────────────────────────────────────────
/** The "OpenAI-compatible" preset's URL — used as a fallback when the user chooses that
 *  preset and hasn't customised the URL. Kept as a constant (not the implicit default)
 *  because Groq is the curated default for a fresh user. */
const OPENAI_COMPATIBLE_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_COMPATIBLE_MODEL = "gpt-3.5-turbo";

// ─── Groq provider constants ───────────────────────────────────────────────
// Groq's public key prefix (Oct 2024 launch). Used only for the soft validation hint
// ("does this look like a Groq key?") — never a hard reject, to keep the form accessible
// to users who paste trimmed/wrapped keys or copy from a custom Groq workspace.
//
// Get a key: https://console.groq.com/keys (free tier available, no card required).
// Privacy: Groq states it does NOT train on user data and does NOT retain submitted
// content after the response per Groq's terms — that contract is what makes Groq a
// reasonable opt-in for a mental-health companion. The exact URL is the OpenAI-compatible
// surface, so no adapter code change was needed to support Groq.
export const GROQ_KEY_PREFIX = "gsk_";
export const GROQ_DEFAULT_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_DEFAULT_MODEL = "llama-3.1-8b-instant";

/** Recommended Groq models for a mental-health companion. The "fast" default is the
 *  llama-3.1-8b-instant endpoint (sub-second TTFT on Groq LPU), the "thoughtful" is the
 *  ~warm 70B variant that mirrors the on-device `quality` brain. Both are open-weight
 *  (Llama-3.1 community licence). Other Groq models work too — the user can type any
 *  slug in the "Model" field — these are just the curated picks. */
export const GROQ_RECOMMENDED_MODELS: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly description: string;
}> = [
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant · fast",
    description: "Snappy, low-cost. Use when reply speed matters more than nuance.",
  },
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B Versatile · thoughtful",
    description:
      "Warmer, more empathetic. Use when the conversation needs more nuance (mirrors on-device `quality`).",
  },
  {
    id: "llama-3.1-70b-versatile",
    label: "Llama 3.1 70B Versatile",
    description: "Slightly older 70B alternative; only needed if 3.3 is unavailable in your region.",
  },
];

// ─── Storage keys ──────────────────────────────────────────────────────────
const PREF_KEY = "nilamind_cloud_api_enabled";
const KEY_KEY = "nilamind_cloud_api_key";
const URL_KEY = "nilamind_cloud_api_url";
const MODEL_KEY = "nilamind_cloud_api_model";
const PROVIDER_KEY = "nilamind_cloud_api_provider";

/** Provider preset identifier — also the persisted value in `nilamind_cloud_api_provider`. */
export type CloudProvider = "groq" | "openai-compatible";

const DEFAULT_PROVIDER: CloudProvider = "groq";

/** Resolve the default URL / model for a given provider. Pure. */
function providerDefaults(p: CloudProvider): { url: string; model: string } {
  if (p === "groq") return { url: GROQ_DEFAULT_URL, model: GROQ_DEFAULT_MODEL };
  return { url: OPENAI_COMPATIBLE_URL, model: OPENAI_COMPATIBLE_MODEL };
}

/** Storage helpers — the setters are deliberately no-ops on bad input rather than
 *  tossing an exception, since this module is read on every Cloud backend call. */
function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string): void {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
}
function safeRemove(k: string): void {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
}

// ─── Groq key validation (visual hint, never a hard reject) ─────────────────
// Soft validation that the pasted string LOOKS like a Groq key — used to render an
// inline "Looks like a Groq key ✓" or "Groq keys start with gsk_" message under the
// input. Always returns ok=true unless the input is empty so it never BLOCKS saving
// (the connection test is the actual safety net; folks on custom Groq workspaces or
// with rotated keys may have keys with different shape).
export interface GroqKeyValidation {
  ok: boolean;
  hint: string;
}

export function validateGroqKey(key: string): GroqKeyValidation {
  if (!key || !key.trim()) {
    return { ok: false, hint: "Enter your Groq API key." };
  }
  const trimmed = key.trim();
  if (trimmed.startsWith(GROQ_KEY_PREFIX)) {
    return { ok: true, hint: "" };
  }
  if (trimmed.startsWith("sk-")) {
    return {
      ok: false,
      hint: "That looks like an OpenAI key, not a Groq key. Groq keys start with gsk_.",
    };
  }
  return {
    ok: false,
    hint: "Groq keys usually start with gsk_. Double-check the key from console.groq.com/keys.",
  };
}

export function isCloudApiEnabled(): boolean {
  return safeGet(PREF_KEY) === "true";
}

export function setCloudApiEnabled(on: boolean): void {
  if (on) safeSet(PREF_KEY, "true");
  else safeRemove(PREF_KEY);
}

export function getCloudApiKey(): string {
  return safeGet(KEY_KEY) ?? "";
}

export function setCloudApiKey(key: string): void {
  if (key) safeSet(KEY_KEY, key);
  else safeRemove(KEY_KEY);
}

/**
 * Resolve the URL for the CURRENT provider. Falls back to the provider's default URL
 * when the user hasn't overridden it (no URL_KEY in storage). The "user hasn't
 * overridden" rule is independent of provider: a user who picks "openai-compatible"
 * and never types a custom URL gets the OpenAI URL; a user who picks "groq" and
 * never types a custom URL gets the Groq URL; a user who picks either and then
 * types a custom URL keeps that URL even after switching providers back and forth.
 */
export function getCloudApiUrl(): string {
  const stored = safeGet(URL_KEY);
  if (stored) return stored;
  return providerDefaults(getCloudApiProvider()).url;
}

export function setCloudApiUrl(url: string): void {
  const trimmed = (url ?? "").trim();
  const provider = getCloudApiProvider();
  const defaultForProvider = providerDefaults(provider).url;
  // If the user types the provider-default URL, persist nothing — the getter
  // derives it from the provider, so they can switch without losing their intent.
  if (trimmed && trimmed !== defaultForProvider) safeSet(URL_KEY, trimmed);
  else safeRemove(URL_KEY);
}

/** Active = enabled AND key present — the backend is actually usable. */
export function isCloudApiActive(): boolean {
  return isCloudApiEnabled() && !!getCloudApiKey();
}

/** Same provider-aware fallback as getCloudApiUrl, but for the model field. */
export function getCloudApiModel(): string {
  const stored = safeGet(MODEL_KEY);
  if (stored) return stored;
  return providerDefaults(getCloudApiProvider()).model;
}

export function setCloudApiModel(model: string): void {
  const trimmed = (model ?? "").trim();
  const provider = getCloudApiProvider();
  const defaultForProvider = providerDefaults(provider).model;
  if (trimmed && trimmed !== defaultForProvider) safeSet(MODEL_KEY, trimmed);
  else safeRemove(MODEL_KEY);
}

/** Current provider preset. Defaults to "groq" so first-time users land on the curated
 *  path; existing users with no saved provider keep the default too (their URL_KEY,
 *  if non-default, is preserved through the implicit Groq default). */
export function getCloudApiProvider(): CloudProvider {
  const stored = safeGet(PROVIDER_KEY);
  if (stored === "groq" || stored === "openai-compatible") return stored;
  return DEFAULT_PROVIDER;
}

/**
 * Switch the provider preset. The URL/model preset for the new provider takes effect
 * ONLY when the user hasn't typed a custom URL or model — anything stored in
 * URL_KEY/MODEL_KEY is preserved (their experience as a power user matters more than
 * auto-magic normalisation).
 */
export function setCloudApiProvider(p: CloudProvider): void {
  safeSet(PROVIDER_KEY, p);
  // No mutation of URL_KEY/MODEL_KEY needed: the getters above already resolve to
  // the right default via `providerDefaults()`, so a fresh user on "groq" reads
  // the Groq URL; a user who has a custom URL stored keeps it; a user who
  // round-trips back to openai-compatible reads the OpenAI URL.
  //
  // The only edge case: a user who has been on openai-compatible with the default
  // URL (no URL_KEY), then we add the Groq landing — they want Groq NOW and
  // they need the URL_KEY to be empty so the getter returns the Groq URL. That
  // already holds because no URL_KEY was ever written. Done.
}
