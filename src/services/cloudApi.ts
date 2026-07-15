// Optional cloud API tier — lets users bring their own API key for a cloud model.
// DEFAULT is on-device only; cloud is opt-in. Privacy: user must explicitly enter their key
// and understand that messages leave the device. This module stores the preference + key.
// The key is kept in localStorage (not secureLocal) — same as a browser password manager.
// The model itself is NOT shipped; the adapter uses whatever OpenAI-compatible endpoint the user provides.

const PREF_KEY = "nilamind_cloud_api_enabled";
const KEY_KEY = "nilamind_cloud_api_key";
const URL_KEY = "nilamind_cloud_api_url";
const MODEL_KEY = "nilamind_cloud_api_model";

const DEFAULT_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-3.5-turbo";

export function isCloudApiEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "true";
  } catch {
    return false;
  }
}

export function setCloudApiEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(PREF_KEY, "true");
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}

export function getCloudApiKey(): string {
  try {
    return localStorage.getItem(KEY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setCloudApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_KEY, key);
    else localStorage.removeItem(KEY_KEY);
  } catch {
    /* ignore */
  }
}

export function getCloudApiUrl(): string {
  try {
    return localStorage.getItem(URL_KEY) ?? DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}

export function setCloudApiUrl(url: string): void {
  try {
    if (url && url !== DEFAULT_URL) localStorage.setItem(URL_KEY, url);
    else localStorage.removeItem(URL_KEY);
  } catch {
    /* ignore */
  }
}

/** Active = enabled AND key present — the backend is actually usable. */
export function isCloudApiActive(): boolean {
  return isCloudApiEnabled() && !!getCloudApiKey();
}

export function getCloudApiModel(): string {
  try {
    return localStorage.getItem(MODEL_KEY) ?? DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function setCloudApiModel(model: string): void {
  try {
    if (model && model !== DEFAULT_MODEL) localStorage.setItem(MODEL_KEY, model);
    else localStorage.removeItem(MODEL_KEY);
  } catch {
    /* ignore */
  }
}
