// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const store = new Map<string, string>();
import { vi } from "vitest";
vi.mock("../services/storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  }),
  DAY_MS: 86_400_000,
  localDateKey: (d: Date = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
}));

import CaregiverShareScreen from "./CaregiverShareScreen";
import { setLanguage, t } from "../services/i18n";

afterEach(() => { cleanup(); });
beforeEach(() => { store.clear(); setLanguage("en"); });

describe("CaregiverShareScreen — i18n consent copy (Phase 19)", () => {
  it("renders the i18n-ized consent body text instead of hardcoded Indian-context copy", () => {
    render(<CaregiverShareScreen />);
    expect(screen.getByText(new RegExp(t("cg_consent_body").slice(0, 30)))).toBeTruthy();
  });

  it("renders the share title from i18n", () => {
    render(<CaregiverShareScreen />);
    expect(screen.getByText(t("shareTrustedTitle"))).toBeTruthy();
  });
});
