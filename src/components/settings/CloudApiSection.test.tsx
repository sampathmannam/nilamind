// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import CloudApiSection from "./CloudApiSection";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
});
afterEach(cleanup);

describe("CloudApiSection", () => {
  it("enables cloud API and shows the Groq get-key link by default", () => {
    render(<CloudApiSection />);
    fireEvent.click(screen.getByRole("switch", { name: "Toggle cloud API" }));
    expect(screen.getByText("Get your free Groq API key")).toBeTruthy();
  });

  it("switching to Custom (OpenAI-compatible) shows the Google AI Studio get-key link", () => {
    render(<CloudApiSection />);
    fireEvent.click(screen.getByRole("switch", { name: "Toggle cloud API" }));
    fireEvent.click(screen.getByText(/Custom \(OpenAI-compatible\)/));
    expect(screen.getByText("Get your free Google AI Studio (Gemini) API key")).toBeTruthy();
  });

  it("typing a Groq key persists it via cloudApi", () => {
    render(<CloudApiSection />);
    fireEvent.click(screen.getByRole("switch", { name: "Toggle cloud API" }));
    const input = screen.getByPlaceholderText("gsk_…");
    fireEvent.change(input, { target: { value: "gsk_test123" } });
    expect(store.get("nilamind_cloud_api_key")).toBe("gsk_test123");
  });
});
