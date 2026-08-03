// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const ls = new Map<string, string>();
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
    setItem: (k: string, v: string) => { ls.set(k, String(v)); },
    removeItem: (k: string) => { ls.delete(k); },
  }),
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: { setStyle: vi.fn() },
  Style: { Light: 0, Dark: 1 },
}));

import { getThemeChoice, setThemeChoice, applyTheme } from "./theme";

beforeEach(() => {
  ls.clear();
  document.documentElement.classList.remove("theme-light");
});
afterEach(() => {
  document.documentElement.classList.remove("theme-light");
});

describe("theme", () => {
  describe("getThemeChoice", () => {
    it("returns 'light' by default when nothing is stored", () => {
      expect(getThemeChoice()).toBe("light");
    });

    it("returns 'dark' when dark was saved", () => {
      ls.set("nilamind_theme", "dark");
      expect(getThemeChoice()).toBe("dark");
    });

    it("returns 'system' when system was saved", () => {
      ls.set("nilamind_theme", "system");
      expect(getThemeChoice()).toBe("system");
    });

    it("returns 'light' for any invalid stored value", () => {
      ls.set("nilamind_theme", "neon");
      expect(getThemeChoice()).toBe("light");
    });
  });

  describe("setThemeChoice + applyTheme", () => {
    it("persists the choice and applyTheme resolves it", () => {
      setThemeChoice("dark");
      expect(getThemeChoice()).toBe("dark");
      const resolved = applyTheme();
      expect(resolved).toBe("dark");
    });

    it("applyTheme toggles theme-light class on documentElement for light", () => {
      applyTheme("light");
      expect(document.documentElement.classList.contains("theme-light")).toBe(true);
    });

    it("applyTheme removes theme-light class for dark", () => {
      document.documentElement.classList.add("theme-light");
      applyTheme("dark");
      expect(document.documentElement.classList.contains("theme-light")).toBe(false);
    });

    it("setThemeChoice calls applyTheme automatically", () => {
      setThemeChoice("light");
      expect(document.documentElement.classList.contains("theme-light")).toBe(true);
      setThemeChoice("dark");
      expect(document.documentElement.classList.contains("theme-light")).toBe(false);
    });

    it("applyTheme defaults to current saved choice", () => {
      ls.set("nilamind_theme", "dark");
      const resolved = applyTheme();
      expect(resolved).toBe("dark");
      expect(document.documentElement.classList.contains("theme-light")).toBe(false);
    });
  });
});
