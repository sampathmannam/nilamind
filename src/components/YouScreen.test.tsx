// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// U5.2 — storage corruption error banner on the You tab.
// Mirrors the TodayScreen.test.tsx error-banner pattern: we swap secureLocal with an in-memory
// store Map so we can inject corrupted (unparseable) blobs for specific keys, then assert the
// banner renders when the component's useMemo detects the failure.

const store = new Map<string, string>();
vi.mock("../services/secureLocal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/secureLocal")>();
  return {
    ...actual,
    secureLocal: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
});
vi.mock("../hooks/useHaptics", () => ({ hapticMedium: vi.fn() }));

// MatchMedia mock for useReducedMotion hook (used by ConfettiBurst)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import YouScreen from "./YouScreen";

afterEach(() => { cleanup(); store.clear(); });

const noop = () => {};

describe("YouScreen — data error feedback (U5.2)", () => {
  it("shows error banner when a storage key contains corrupted data", () => {
    // Inject an unparseable JSON blob for one of the scanned keys.
    // The component's dataErrors useMemo calls secureLocal.getItem then JSON.parse;
    // "garbage" causes JSON.parse to throw, adding the key to badKeys.
    store.set("nilamind_checkins", "garbage");

    render(<YouScreen go={noop} onOpenCrisis={noop} />);

    // The banner text includes "couldn't load" (HTML-entity'd apostrophe in the source).
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/couldn't load/i)).toBeTruthy();
  });
});
