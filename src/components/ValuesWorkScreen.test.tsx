// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import ValuesWorkScreen from "./ValuesWorkScreen";

afterEach(() => { cleanup(); store.clear(); });

describe("ValuesWorkScreen — research-citation line (clinical research wave 2)", () => {
  it("shows a visible citation to Ferrari, Hunt, Harrysunker, Abbott, Beath & Einstein (2019) and Neff (2003)", () => {
    render(<ValuesWorkScreen />);
    expect(screen.getByText(/Ferrari, Hunt, Harrysunker, Abbott, Beath/i)).toBeTruthy();
    expect(screen.getByText(/Neff, 2003/i)).toBeTruthy();
  });
});
