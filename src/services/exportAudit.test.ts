import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  appendToSecureArray: <T>(key: string, item: T, cap?: number): T[] => {
    const arr: T[] = store[key] ? JSON.parse(store[key]) : [];
    arr.push(item);
    if (cap && arr.length > cap) arr.splice(0, arr.length - cap);
    store[key] = JSON.stringify(arr);
    return arr;
  },
}));

import { recordExportAudit, getExportAudit } from "./exportAudit";

beforeEach(() => { store = {}; });

const baseEntry = {
  kind: "csv" as const,
  scope: "mood data",
  destination: "device_download" as const,
};

describe("recordExportAudit", () => {
  it("adds an entry to the audit trail", () => {
    recordExportAudit(baseEntry);
    const audit = getExportAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0].kind).toBe("csv");
    expect(audit[0].scope).toBe("mood data");
  });

  it("includes a timestamp", () => {
    recordExportAudit(baseEntry);
    const audit = getExportAudit();
    expect(typeof audit[0].timestamp).toBe("number");
    expect(audit[0].timestamp).toBeGreaterThan(0);
  });

  it("appends multiple entries", () => {
    recordExportAudit(baseEntry);
    recordExportAudit({ ...baseEntry, kind: "pdf" });
    expect(getExportAudit()).toHaveLength(2);
  });
});

describe("getExportAudit", () => {
  it("returns entries with timestamp", () => {
    recordExportAudit(baseEntry);
    const audit = getExportAudit();
    expect(audit[0]).toHaveProperty("timestamp");
    expect(audit[0]).toHaveProperty("kind");
    expect(audit[0]).toHaveProperty("scope");
    expect(audit[0]).toHaveProperty("destination");
  });

  it("returns [] when no entries exist", () => {
    expect(getExportAudit()).toEqual([]);
  });

  it("returns [] on corrupt data", () => {
    store["nilamind_export_audit"] = "not-json{{{";
    expect(getExportAudit()).toEqual([]);
  });

  it("returns [] on non-array JSON", () => {
    store["nilamind_export_audit"] = JSON.stringify({ not: "an array" });
    expect(getExportAudit()).toEqual([]);
  });
});

describe("entry cap", () => {
  it("caps entries at 100", () => {
    for (let i = 0; i < 110; i++) {
      recordExportAudit({ ...baseEntry, scope: `entry-${i}` });
    }
    const audit = getExportAudit();
    expect(audit).toHaveLength(100);
    expect(audit[0].scope).toBe("entry-10");
  });
});
