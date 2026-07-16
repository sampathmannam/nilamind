import { describe, it, expect } from "vitest";
import {
  trackConnection,
  assessConnection,
  connectionContextBlock,
  type ConnectionRecord,
  type ConnectionAssessment,
} from "./humanConnection";

describe("trackConnection", () => {
  it("returns a ConnectionRecord with date and type", () => {
    const rec = trackConnection("call", "2026-07-16");
    expect(rec.type).toBe("call");
    expect(rec.date).toBe("2026-07-16");
  });
});

describe("assessConnection", () => {
  it("returns 'low' for no connections", () => {
    const result = assessConnection([]);
    expect(result.level).toBe("low");
    expect(result.totalConnections).toBe(0);
  });

  it("returns 'adequate' for 3+ connections in a week", () => {
    const records: ConnectionRecord[] = [
      { type: "call", date: "2026-07-14" },
      { type: "text", date: "2026-07-15" },
      { type: "in_person", date: "2026-07-16" },
    ];
    const result = assessConnection(records, "2026-07-16");
    expect(result.level).toBe("adequate");
    expect(result.totalConnections).toBe(3);
  });

  it("returns 'strong' for 5+ connections in a week", () => {
    const records: ConnectionRecord[] = [
      { type: "call", date: "2026-07-12" },
      { type: "text", date: "2026-07-13" },
      { type: "in_person", date: "2026-07-14" },
      { type: "call", date: "2026-07-15" },
      { type: "text", date: "2026-07-16" },
    ];
    const result = assessConnection(records, "2026-07-16");
    expect(result.level).toBe("strong");
  });

  it("only counts connections from the last 7 days", () => {
    const records: ConnectionRecord[] = [
      { type: "call", date: "2026-07-01" },
      { type: "call", date: "2026-07-02" },
      { type: "call", date: "2026-07-03" },
    ];
    const result = assessConnection(records, "2026-07-16");
    expect(result.level).toBe("low");
    expect(result.totalConnections).toBe(0);
  });

  it("returns breakdown by type", () => {
    const records: ConnectionRecord[] = [
      { type: "call", date: "2026-07-15" },
      { type: "text", date: "2026-07-15" },
      { type: "call", date: "2026-07-16" },
    ];
    const result = assessConnection(records, "2026-07-16");
    expect(result.byType.call).toBe(2);
    expect(result.byType.text).toBe(1);
  });
});

describe("connectionContextBlock", () => {
  it("returns a block for low connection", () => {
    const block = connectionContextBlock([]);
    expect(block).toContain("Connection signal");
  });

  it("returns empty for adequate connection", () => {
    const records: ConnectionRecord[] = [
      { type: "call", date: "2026-07-14" },
      { type: "text", date: "2026-07-15" },
      { type: "in_person", date: "2026-07-16" },
    ];
    const block = connectionContextBlock(records, "2026-07-16");
    expect(block).toBe("");
  });
});
