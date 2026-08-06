// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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

import NilaMemoryScreen, { groupByKind } from "./NilaMemoryScreen";
import type { Insight } from "../services/nilaInsights";

afterEach(() => { cleanup(); store.clear(); });

describe("groupByKind (pure)", () => {
  it("buckets insights by kind, omitting empty groups", () => {
    const all: Insight[] = [
      { id: "1", kind: "what_helps", text: "walking", date: "2026-08-06", source: "user" },
      { id: "2", kind: "pattern", text: "mornings are hard", date: "2026-08-06", source: "reflection" },
    ];
    const groups = groupByKind(all);
    expect(groups.map((g) => g.kind)).toEqual(["what_helps", "pattern"]); // INSIGHT_KINDS declaration order
  });
});

describe("NilaMemoryScreen", () => {
  it("renders the empty state when there's nothing to remember yet", () => {
    render(<NilaMemoryScreen />);
    expect(screen.getByText("Nothing yet")).toBeTruthy();
  });

  it("shows an 'Add something yourself' affordance", () => {
    render(<NilaMemoryScreen />);
    expect(screen.getByRole("button", { name: /add something yourself/i })).toBeTruthy();
  });

  it("2026-08-06: adding an insight calls upsertUserInsight and it appears grouped under its kind", () => {
    render(<NilaMemoryScreen />);
    fireEvent.click(screen.getByRole("button", { name: /add something yourself/i }));

    const select = screen.getByLabelText(/add something yourself/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "what_helps" } });

    const textarea = screen.getByLabelText(/what should nila remember/i);
    fireEvent.change(textarea, { target: { value: "a slow morning walk" } });

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(screen.getByText("a slow morning walk")).toBeTruthy();
    expect(screen.getByText("What helps you")).toBeTruthy(); // KIND_LABELS.what_helps
    const raw = store.get("nilamind_nila_insights");
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!);
    expect(saved.some((i: Insight) => i.text === "a slow morning walk" && i.source === "user")).toBe(true);
  });

  it("the save button is disabled until there's text", () => {
    render(<NilaMemoryScreen />);
    fireEvent.click(screen.getByRole("button", { name: /add something yourself/i }));
    const saveBtn = screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("cancel closes the add form without saving anything", () => {
    render(<NilaMemoryScreen />);
    fireEvent.click(screen.getByRole("button", { name: /add something yourself/i }));
    fireEvent.change(screen.getByLabelText(/what should nila remember/i), { target: { value: "should not save" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("should not save")).toBeNull();
    expect(store.get("nilamind_nila_insights")).toBeFalsy();
  });
});
