import { describe, it, expect, beforeEach } from "vitest";

// tippSafetyGate.ts -> secureLocal (health-condition data, must be encrypted at rest). Mock
// secureLocal the same way other service tests do, so this stays a pure unit test.
const store = new Map<string, string>();
import { vi } from "vitest";
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [],
  flush: () => {},
}));

import {
  getTippSafetyState,
  saveTippSafetyFlags,
  hasTemperatureCaution,
  TIPP_SAFETY_ITEMS,
  defaultTippSafetyFlags,
} from "./tippSafetyGate";

beforeEach(() => store.clear());

// 2026-07-12 Wave 3, Group E — TIPP tool's one-time safety-gate checklist. Cardiac
// arrhythmia/pacemaker, uncontrolled hypertension, beta-blockers/HR meds, seizure disorder, ED with
// bradycardia history, pregnancy, cold sensitivity (spec doc §3's contraindication list for the
// Temperature component — Shattock & Tipton 2012 autonomic-conflict arrhythmia risk).
describe("tippSafetyGate", () => {
  it("is not completed before the user has ever filled it in", () => {
    const s = getTippSafetyState();
    expect(s.completed).toBe(false);
  });

  it("lists all 7 safety-gate items from spec doc §3", () => {
    const keys = TIPP_SAFETY_ITEMS.map((i) => i.key);
    expect(keys).toEqual([
      "cardiac", "hypertension", "hrMeds", "seizure", "edBradycardia", "pregnancy", "coldSensitivity",
    ]);
    for (const item of TIPP_SAFETY_ITEMS) expect(item.label.length).toBeGreaterThan(0);
  });

  it("default flags are all false (no caution assumed before the user answers)", () => {
    const flags = defaultTippSafetyFlags();
    expect(Object.values(flags).every((v) => v === false)).toBe(true);
  });

  it("hasTemperatureCaution is false when every flag is false", () => {
    expect(hasTemperatureCaution(defaultTippSafetyFlags())).toBe(false);
  });

  it("hasTemperatureCaution is true when ANY single flag is checked", () => {
    expect(hasTemperatureCaution({ ...defaultTippSafetyFlags(), cardiac: true })).toBe(true);
    expect(hasTemperatureCaution({ ...defaultTippSafetyFlags(), pregnancy: true })).toBe(true);
    expect(hasTemperatureCaution({ ...defaultTippSafetyFlags(), coldSensitivity: true })).toBe(true);
  });

  it("saveTippSafetyFlags persists the checklist and marks it completed", () => {
    const flags = { ...defaultTippSafetyFlags(), pregnancy: true };
    const saved = saveTippSafetyFlags(flags);
    expect(saved.completed).toBe(true);
    expect(saved.flags.pregnancy).toBe(true);

    const reread = getTippSafetyState();
    expect(reread.completed).toBe(true);
    expect(reread.flags.pregnancy).toBe(true);
    expect(reread.flags.cardiac).toBe(false);
  });

  it("is stored encrypted-at-rest via secureLocal, not raw window.localStorage", () => {
    saveTippSafetyFlags(defaultTippSafetyFlags());
    expect(store.has("nilamind_tipp_safety")).toBe(true);
  });

  it("saving with no boxes checked still marks the checklist completed (an explicit 'none apply' answer)", () => {
    const saved = saveTippSafetyFlags(defaultTippSafetyFlags());
    expect(saved.completed).toBe(true);
    expect(hasTemperatureCaution(saved.flags)).toBe(false);
  });
});
