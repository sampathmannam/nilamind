import { vi, describe, it, expect, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  appendToSecureArray: <T>(key: string, item: T) => {
    const arr: T[] = store.has(key) ? JSON.parse(store.get(key)!) : [];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
    return arr;
  },
}));

import { checkCaregiverAlerts, type CaregiverAlertResult } from "./caregiverAlert";

const today = () => new Date().toISOString().split("T")[0];

beforeEach(() => store.clear());

describe("checkCaregiverAlerts", () => {
  it("shouldAlert=false when no contacts exist", () => {
    const r = checkCaregiverAlerts();
    expect(r.shouldAlert).toBe(false);
    expect(r.contactIds).toEqual([]);
  });

  it("shouldAlert=false when contacts exist but none have autoAlert enabled", () => {
    store.set("nilamind_caregiver_contacts", JSON.stringify([
      { id: "cg_1", name: "A", phoneOrEmail: "a@x.com", relationship: "", addedAt: today() },
    ]));
    store.set("nilamind_caregiver_prefs", JSON.stringify({}));
    const r = checkCaregiverAlerts();
    expect(r.shouldAlert).toBe(false);
  });

  it("shouldAlert=true when contact has autoAlert enabled and checkins cross the threshold", () => {
    store.set("nilamind_caregiver_contacts", JSON.stringify([
      { id: "cg_1", name: "Priya", phoneOrEmail: "p@x.com", relationship: "Sister", addedAt: today() },
    ]));
    store.set("nilamind_caregiver_prefs", JSON.stringify({
      cg_1: {
        shareCategories: { mood: true, phase: false, sleep: false, medication: false, wellbeing: false, checkins: false },
        autoAlert: { enabled: true, thresholdDays: 2, minIntensity: 7 },
      },
    }));
    store.set("nilamind_checkins", JSON.stringify([
      { date: daysAgo(2), intensity: 8 },
      { date: daysAgo(1), intensity: 9 },
      { date: today(), intensity: 8 },
    ]));
    const r = checkCaregiverAlerts();
    expect(r.shouldAlert).toBe(true);
    expect(r.contactIds).toContain("cg_1");
    expect(r.reason).toBeTruthy();
  });

  it("shouldAlert=false when intensity is below minIntensity", () => {
    store.set("nilamind_caregiver_contacts", JSON.stringify([
      { id: "cg_1", name: "Priya", phoneOrEmail: "p@x.com", relationship: "Sister", addedAt: today() },
    ]));
    store.set("nilamind_caregiver_prefs", JSON.stringify({
      cg_1: {
        shareCategories: { mood: true, phase: false, sleep: false, medication: false, wellbeing: false, checkins: false },
        autoAlert: { enabled: true, thresholdDays: 2, minIntensity: 7 },
      },
    }));
    store.set("nilamind_checkins", JSON.stringify([
      { date: daysAgo(2), intensity: 6 },
      { date: daysAgo(1), intensity: 5 },
      { date: today(), intensity: 4 },
    ]));
    const r = checkCaregiverAlerts();
    expect(r.shouldAlert).toBe(false);
  });
});

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
