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

import { t, getLanguage, setLanguage, LANGUAGES, currentLanguage } from "./i18n";

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
});
