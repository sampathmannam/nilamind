import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: vi.fn((key: string, item: any) => {
    const arr = store.get(key) ? JSON.parse(store.get(key)!) : [];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
  }),
}));

import { createMedication, loadMedications, saveMedications, logMedication, loadMedicationLogs, adherenceRate, commonSideEffects, adherenceSummary, recordDoseChange, resolveSideEffect } from "./medicationAdherence";

describe("medicationAdherence", () => {
  beforeEach(() => { store.clear(); });

  it("createMedication returns a structured med", () => {
    const m = createMedication("Sertraline", "50mg", "08:00", "daily");
    expect(m.id).toMatch(/^med_/);
    expect(m.name).toBe("Sertraline");
    expect(m.active).toBe(true);
  });

  it("save and load medications round-trip", () => {
    const m1 = createMedication("Lamotrigine", "200mg", "08:00", "daily");
    const m2 = createMedication("Quetiapine", "25mg", "21:00", "as_needed");
    saveMedications([m1, m2]);
    const loaded = loadMedications();
    expect(loaded).toHaveLength(2);
  });

  it("logMedication records a log entry", () => {
    const m = createMedication("Test", "10mg", "08:00", "daily");
    logMedication(m.id, true, [{ symptom: "Nausea", severity: 3, bother: 5 }]);
    const logs = loadMedicationLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].taken).toBe(true);
  });

  it("adherenceRate computes percentage for recent days", () => {
    const medId = "med_test_1";
    const today = new Date().toISOString().split("T")[0];
    store.set("nilamind_med_logs", JSON.stringify([
      { id: "1", medId, date: today, taken: true, takenAt: "08:00", sideEffects: [] },
      { id: "2", medId, date: today, taken: true, takenAt: "08:00", sideEffects: [] },
    ]));
    expect(adherenceRate(medId)).toBe(100);
  });

  it("commonSideEffects aggregates by symptom", () => {
    const medId = "med_test_1";
    store.set("nilamind_med_logs", JSON.stringify([
      { id: "1", medId, date: new Date().toISOString().split("T")[0], taken: true, takenAt: "", sideEffects: [{ symptom: "Nausea", severity: 5, bother: 7 }] },
      { id: "2", medId, date: new Date().toISOString().split("T")[0], taken: true, takenAt: "", sideEffects: [{ symptom: "Nausea", severity: 3, bother: 5 }] },
    ]));
    const se = commonSideEffects(medId);
    expect(se[0].symptom).toBe("Nausea");
    expect(se[0].count).toBe(2);
    expect(se[0].avgSeverity).toBe(4);
  });

  it("adherenceSummary returns zero counts with no medications", () => {
    expect(adherenceSummary()).toEqual({ activeMeds: 0, avgAdherence: 0 });
  });

  it("adherenceSummary averages adherence across active meds only", () => {
    const m1 = createMedication("A", "10mg", "08:00", "daily");
    const m2 = createMedication("B", "20mg", "20:00", "daily");
    const inactive = createMedication("C", "5mg", "12:00", "daily");
    inactive.active = false;
    saveMedications([m1, m2, inactive]);
    const today = new Date().toISOString().split("T")[0];
    store.set("nilamind_med_logs", JSON.stringify([
      { id: "1", medId: m1.id, date: today, taken: true, takenAt: "08:00", sideEffects: [] },
      { id: "2", medId: m2.id, date: today, taken: false, takenAt: "", sideEffects: [] },
    ]));
    const summary = adherenceSummary();
    expect(summary.activeMeds).toBe(2);
    expect(summary.avgAdherence).toBe(50);
  });

  // G3 — dose-change tracking
  it("recordDoseChange adds a DoseChange entry to the medication", () => {
    const m = createMedication("Lithium", "300mg", "08:00", "daily");
    saveMedications([m]);
    recordDoseChange(m.id, "300mg", "600mg");
    const meds = loadMedications();
    expect(meds[0].doseChanges).toHaveLength(1);
    expect(meds[0].doseChanges![0].oldDose).toBe("300mg");
    expect(meds[0].doseChanges![0].newDose).toBe("600mg");
    expect(meds[0].dose).toBe("600mg"); // dose field is also updated
  });

  it("recordDoseChange handles non-existent medication gracefully", () => {
    // Should not throw
    recordDoseChange("nonexistent_med_id", "10mg", "20mg");
    expect(loadMedications()).toHaveLength(0);
  });

  it("recordDoseChange preserves existing dose changes", () => {
    const m = createMedication("Test", "10mg", "08:00", "daily");
    m.doseChanges = [{ medId: m.id, date: "2026-06-01", oldDose: "5mg", newDose: "10mg" }];
    saveMedications([m]);
    recordDoseChange(m.id, "10mg", "20mg");
    const meds = loadMedications();
    expect(meds[0].doseChanges).toHaveLength(2);
  });

  // G4 — side-effect duration/resolution
  it("resolveSideEffect sets resolvedAt on the matching side effect entry", () => {
    const m = createMedication("Test", "10mg", "08:00", "daily");
    const log = logMedication(m.id, true, [{ symptom: "headache", severity: 5, bother: 4 }]);
    const se = log.sideEffects[0];
    expect(se.loggedAt).toBeDefined(); // loggedAt should be set by logMedication
    expect(se.resolvedAt).toBeUndefined();

    resolveSideEffect(log.id, "headache");
    const logs = loadMedicationLogs();
    const resolved = logs[0].sideEffects.find((s) => s.symptom === "headache");
    expect(resolved?.resolvedAt).toBeDefined();
  });

  it("resolveSideEffect handles non-existent log gracefully", () => {
    // Should not throw
    resolveSideEffect("nonexistent_log_id", "headache");
  });

  it("resolveSideEffect only resolves the matching symptom, not others", () => {
    const m = createMedication("Test", "10mg", "08:00", "daily");
    logMedication(m.id, true, [
      { symptom: "nausea", severity: 3, bother: 2 },
      { symptom: "dizziness", severity: 4, bother: 3 },
    ]);
    resolveSideEffect("1", "nausea"); // wrong ID, but tests isolation
    const logs = loadMedicationLogs();
    // The log won't be found by wrong ID, but let's test with the real ID
    const log = logs[0];
    resolveSideEffect(log.id, "nausea");
    const updatedLogs = loadMedicationLogs();
    const nausea = updatedLogs[0].sideEffects.find((s) => s.symptom === "nausea");
    const dizziness = updatedLogs[0].sideEffects.find((s) => s.symptom === "dizziness");
    expect(nausea?.resolvedAt).toBeDefined();
    expect(dizziness?.resolvedAt).toBeUndefined();
  });

  it("logMedication sets loggedAt timestamp on side effects", () => {
    const m = createMedication("Test", "10mg", "08:00", "daily");
    const log = logMedication(m.id, true, [{ symptom: "fatigue", severity: 2, bother: 1 }]);
    expect(log.sideEffects[0].loggedAt).toBeDefined();
    expect(typeof log.sideEffects[0].loggedAt).toBe("string");
  });
});
