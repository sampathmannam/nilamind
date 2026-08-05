// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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

afterEach(() => { cleanup(); store.clear(); });

const noop = () => {};

describe("YouScreen — data error feedback (U5.2)", () => {
  it("shows error banner when a storage key contains corrupted data", () => {
    store.set("nilamind_checkins", "garbage");
    render(<YouScreen go={noop} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/couldn't load/i)).toBeTruthy();
  });
});

describe("YouScreen — simplified layout", () => {
  it("renders streak card", () => {
    render(<YouScreen go={noop} />);
    expect(screen.getByText(/-day streak/)).toBeTruthy();
  });

  it("renders all navigation rows", () => {
    render(<YouScreen go={noop} />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Insights")).toBeTruthy();
    expect(screen.getByText("Nila Memory")).toBeTruthy();
    expect(screen.getByText("Learn")).toBeTruthy();
    expect(screen.getByText("Caregiver")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Your Data")).toBeTruthy();
  });

  it("calls go with correct targets on press", () => {
    const go = vi.fn();
    render(<YouScreen go={go} />);
    screen.getByText("Dashboard").click();
    expect(go).toHaveBeenCalledWith("dashboard");
    screen.getByText("Insights").click();
    expect(go).toHaveBeenCalledWith("insights");
    screen.getByText("Nila Memory").click();
    expect(go).toHaveBeenCalledWith("nila_memory");
    screen.getByText("Learn").click();
    expect(go).toHaveBeenCalledWith("learn");
    screen.getByText("Caregiver").click();
    expect(go).toHaveBeenCalledWith("caregiver_settings");
    screen.getByText("Settings").click();
    expect(go).toHaveBeenCalledWith("settings");
    screen.getByText("Your Data").click();
    expect(go).toHaveBeenCalledWith("your_data");
  });

  it("does not render contextual suggestion strip", () => {
    render(<YouScreen go={noop} />);
    expect(screen.queryByText(/you_elevated_hint/)).toBeNull();
  });

  it("does not render weekly intention section", () => {
    render(<YouScreen go={noop} />);
    expect(screen.queryByText(/intention/)).toBeNull();
  });

  it("does not render show more toggle", () => {
    render(<YouScreen go={noop} />);
    expect(screen.queryByText(/more resources/)).toBeNull();
  });
});
