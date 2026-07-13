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
}));

import CaregiverShareScreen from "./CaregiverShareScreen";
import { setRegionCode } from "../services/crisisResources";

afterEach(() => { cleanup(); });
beforeEach(() => { store.clear(); });

describe("CaregiverShareScreen — region-aware rationale copy", () => {
  it("mentions the Indian context only when the user's region is India", () => {
    setRegionCode("IN");
    render(<CaregiverShareScreen />);
    expect(screen.getByText(/Indian context/i)).toBeTruthy();
  });

  it("does not mention the Indian context when the user's region is not India", () => {
    setRegionCode("GB");
    render(<CaregiverShareScreen />);
    expect(screen.queryByText(/Indian context/i)).toBeNull();
  });
});
