import { describe, it, expect } from "vitest";
import { inferShame, hasShame } from "./shameInference";

describe("inferShame", () => {
  it("returns 0 for null", () => {
    expect(inferShame(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(inferShame(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(inferShame("")).toBe(0);
  });

  it("returns 4 for 'ashamed'", () => {
    expect(inferShame("ashamed")).toBe(4);
  });

  it("returns 3 for 'shame'", () => {
    expect(inferShame("shame")).toBe(3);
  });

  it("returns 2 for 'unworthy'", () => {
    expect(inferShame("unworthy")).toBe(2);
  });

  it("returns 0 for 'happy'", () => {
    expect(inferShame("happy")).toBe(0);
  });

  it("returns 2 for 'I feel like a failure'", () => {
    expect(inferShame("I feel like a failure")).toBe(2);
  });

  it("is case-insensitive", () => {
    expect(inferShame("ASHAMED")).toBe(4);
    expect(inferShame("Shame")).toBe(3);
  });

  it("detects shame within longer phrases", () => {
    expect(inferShame("I feel so ashamed of what I did")).toBe(4);
    expect(inferShame("feeling humiliated today")).toBe(4);
  });
});

describe("hasShame", () => {
  it("returns false for null", () => {
    expect(hasShame(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasShame(undefined)).toBe(false);
  });

  it("returns true for 'ashamed'", () => {
    expect(hasShame("ashamed")).toBe(true);
  });

  it("returns true for 'shame'", () => {
    expect(hasShame("shame")).toBe(true);
  });

  it("returns true for 'unworthy'", () => {
    expect(hasShame("unworthy")).toBe(true);
  });

  it("returns false for 'happy'", () => {
    expect(hasShame("happy")).toBe(false);
  });

  it("returns true for 'I feel like a failure'", () => {
    expect(hasShame("I feel like a failure")).toBe(true);
  });
});
