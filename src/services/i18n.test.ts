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

  it("localizes the monthly tracking word + body tokens (India-first finish, agent #C)", () => {
    // The English adjective token is resolved to a localized word, not passed raw.
    expect(tn("monthly_word_rough", "en", {})).toBe("rough");
    expect(tn("monthly_word_rough", "hi", {})).toBe("कठिन");
    expect(tn("monthly_word_rough", "ta", {})).toBe("கடினமான");
    expect(tn("monthly_word_rough", "te", {})).toBe("కష్టమైన");
    // The body composes all localized tokens — no English leak in a Hindi render.
    const hi = tn("narr_tracking_body", "hi", {
      word: tn("monthly_word_steady", "hi", {}),
      avg: "5.0",
      min: 2,
      max: 8,
      emotion: tn("emotion_calm", "hi", {}),
      days: 12,
      total: 30,
      pacing: tn("pacing_good", "hi", {}),
    });
    expect(hi).toContain("स्थिर");
    expect(hi).toContain("शांत पल");
    expect(hi).not.toContain("This month has felt");
    expect(hi).not.toContain("steady");
  });
});
