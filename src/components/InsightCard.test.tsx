import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/secureLocal", async () => {
  const actual = await vi.importActual<typeof import("../services/secureLocal")>("../services/secureLocal");
  return { ...actual };
});

import { render, screen } from "@testing-library/react";
import React from "react";
import InsightCard from "./InsightCard";
import type { InsightData } from "./InsightCard";

// @vitest-environment jsdom

beforeEach(() => {
  document.body.innerHTML = "";
});

const base: InsightData = {
  title: "Sleep affects mood",
  body: "You tend to feel better after 7+ hours of sleep.",
  trend: "improving",
  citation: "Harvey et al., 2015",
};

describe("InsightCard", () => {
  it("renders title and body", () => {
    render(<InsightCard insight={base} />);
    expect(screen.getByText("Sleep affects mood")).toBeTruthy();
    expect(screen.getByText(/You tend to feel better/)).toBeTruthy();
  });

  it("renders citation when provided", () => {
    render(<InsightCard insight={base} />);
    expect(screen.getByText(/Harvey et al/)).toBeTruthy();
  });

  it("renders trend icon for improving", () => {
    const { container } = render(<InsightCard insight={base} />);
    expect(container.querySelector(".text-emerald-400")).toBeTruthy();
  });

  it("renders sparkline when provided", () => {
    const withSparkline = { ...base, sparkline: [3, 5, 4, 6, 7, 8, 7, 9, 8, 10] };
    const { container } = render(<InsightCard insight={withSparkline} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders without citation when not provided", () => {
    const noCitation = { ...base, citation: undefined };
    render(<InsightCard insight={noCitation} />);
    expect(screen.queryByText(/Source/)).toBeNull();
  });
});
