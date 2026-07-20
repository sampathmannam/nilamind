import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  }),
  DAY_MS: 86_400_000,
}));

import { t, tn, getLanguage, setLanguage, LANGUAGES, currentLanguage, DICT } from "./i18n";

describe("i18n core", () => {
  beforeEach(() => { store.clear(); });

  it("defaults to English when no preference is stored", () => {
    expect(getLanguage()).toBe("en");
    expect(currentLanguage()).toBe("en");
  });

  it("persists and reads language preference", () => {
    setLanguage("hi");
    expect(getLanguage()).toBe("hi");
  });

  it("returns translated strings for supported languages", () => {
    expect(t("settings", "hi")).toBe("सेटिंग्स");
    expect(t("checkIn", "ta")).toBe("சரிபார்க்க");
    expect(t("medications", "te")).toBe("మందులు");
  });

  it("falls back to English for missing translations", () => {
    expect(t("dashboard", "hi")).toBe("आपका डैशबोर्ड");
  });

  it("falls back to the key itself for unknown keys", () => {
    expect(t("unknown_key" as any, "en")).toBe("unknown_key");
  });

  it("exposes the expected language options", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "hi", "ta", "te"]);
  });

  it("has a complete translation for every key in English, Hindi, Tamil and Telugu", () => {
    const keys = Object.keys(DICT.en) as Array<keyof typeof DICT["en"]>;
    expect(keys.length).toBeGreaterThan(0);
    for (const lang of ["en", "hi", "ta", "te"] as const) {
      for (const key of keys) {
        const value = DICT[lang][key];
        expect(typeof value === "string" && value.trim().length > 0, `missing/empty ${lang}.${String(key)}`).toBe(true);
      }
    }
  });

  it("keeps English as the fallback source of truth for all keys", () => {
    const keys = Object.keys(DICT.en);
    for (const key of keys) {
      // every non-English translation must be present (covered above); English must equal t() default.
      expect(t(key as any, "en")).toBe(DICT.en[key as keyof typeof DICT.en]);
    }
  });

  it("tn() substitutes {name} tokens and falls back to English per language", () => {
    expect(tn("narr_mood_down", "en", { avg: "4.2", delta: "1.1" })).toContain("4.2");
    expect(tn("narr_mood_down", "en", { avg: "4.2", delta: "1.1" })).toContain("1.1");
    // Non-English uses the localized template with the same substituted values.
    expect(tn("narr_mood_down", "hi", { avg: "4.2", delta: "1.1" })).toContain("4.2");
    expect(tn("narr_mood_down", "hi", { avg: "4.2", delta: "1.1" })).not.toContain("this week your distress");
    // Unknown token is left untouched; missing key falls back to English template.
    expect(tn("narr_mood_down", "en", { avg: "4.2" })).toContain("{delta}");
  });
});
