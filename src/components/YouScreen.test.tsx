// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

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
import { buildYouGroups } from "./youRows";

afterEach(() => { cleanup(); store.clear(); });

const noop = () => {};

describe("YouScreen — data error feedback (U5.2)", () => {
  it("shows error banner when a storage key contains corrupted data", async () => {
    store.set("nilamind_checkins", "garbage");
    render(<YouScreen go={noop} onOpenCrisis={noop} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText(/couldn't load/i)).toBeTruthy();
    });
  });
});

describe("YouScreen — simplified layout", () => {
  it("renders streak card", async () => {
    render(<YouScreen go={noop} onOpenCrisis={noop} />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome|-day streak/)).toBeTruthy();
    });
  });

  it("renders exactly the 6 single-source rows (redesign §5.4 — youRows is the only definition)", async () => {
    render(<YouScreen go={noop} onOpenCrisis={noop} />);
    const rows = buildYouGroups().flatMap((g) => g.rows);
    expect(rows.length).toBe(6);
    await waitFor(() => {
      for (const r of rows) {
        expect(screen.getByText(r.label), `row missing: ${r.id}`).toBeTruthy();
      }
    });
    // Merged/moved destinations must not resurface as rows here.
    expect(screen.queryByText("Insights")).toBeNull();
    expect(screen.queryByText("Your progress")).toBeNull();
    expect(screen.queryByText("About Nila")).toBeNull();
  });

  it("calls go with each row's id on press", async () => {
    const go = vi.fn();
    render(<YouScreen go={go} onOpenCrisis={noop} />);
    const rows = buildYouGroups().flatMap((g) => g.rows);
    await waitFor(() => {
      expect(screen.getByText(rows[0].label)).toBeTruthy();
    });
    for (const r of rows) {
      screen.getByText(r.label).click();
      expect(go).toHaveBeenCalledWith(r.id);
    }
  });

  it("does not render contextual suggestion strip", async () => {
    render(<YouScreen go={noop} onOpenCrisis={noop} />);
    await waitFor(() => {
      expect(screen.queryByText(/you_elevated_hint/)).toBeNull();
    });
  });

  it("does not render weekly intention section", async () => {
    render(<YouScreen go={noop} onOpenCrisis={noop} />);
    await waitFor(() => {
      expect(screen.queryByText(/intention/)).toBeNull();
    });
  });

  it("does not render show more toggle", async () => {
    render(<YouScreen go={noop} onOpenCrisis={noop} />);
    await waitFor(() => {
      expect(screen.queryByText(/more resources/)).toBeNull();
    });
  });
});
