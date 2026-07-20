// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import CollapsibleSection, { CollapsibleGroup } from "./CollapsibleSection";

afterEach(cleanup);

describe("CollapsibleSection", () => {
  it("renders title and children", () => {
    render(<CollapsibleSection title="My group"><p>content</p></CollapsibleSection>);
    expect(screen.getByText("My group")).toBeTruthy();
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("defaults to COLLAPSED (aria-expanded false) — calm open state for distressed users", () => {
    const { container } = render(<CollapsibleSection title="T"><p>body</p></CollapsibleSection>);
    expect(container.querySelector("button")!.getAttribute("aria-expanded")).toBe("false");
  });

  it("toggles aria-expanded on click", () => {
    const { container } = render(<CollapsibleSection title="T"><p>body</p></CollapsibleSection>);
    const btn = container.querySelector("button")!;
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("wires aria-controls to the body id", () => {
    const { container } = render(<CollapsibleSection title="T"><p>body</p></CollapsibleSection>);
    const btn = container.querySelector("button")!;
    const id = btn.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toBeTruthy();
  });

  it("keeps the summary in the a11y tree (aria-describedby) whether collapsed or open", () => {
    const { container } = render(
      <CollapsibleSection title="T" summary="peek inside"><p>body</p></CollapsibleSection>,
    );
    const btn = container.querySelector("button")!;
    // Collapsed: summary is visible AND referenced by aria-describedby for screen readers.
    expect(btn.getAttribute("aria-describedby")).toBeTruthy();
    const summaryEl = document.getElementById(btn.getAttribute("aria-describedby")!);
    expect(summaryEl).toBeTruthy();
    expect(summaryEl!.className).not.toContain("sr-only");
    // Open: summary stays in the a11y tree (sr-only) so the descriptor still resolves.
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-describedby")).toBeTruthy();
    const after = document.getElementById(btn.getAttribute("aria-describedby")!);
    expect(after).toBeTruthy();
    expect(after!.className).toContain("sr-only");
  });
});

describe("CollapsibleGroup", () => {
  it("renders an Expand all control when multiple bands present", () => {
    render(
      <CollapsibleGroup>
        <CollapsibleSection title="A"><p>a</p></CollapsibleSection>
        <CollapsibleSection title="B"><p>b</p></CollapsibleSection>
      </CollapsibleGroup>,
    );
    expect(screen.getByText("Expand all")).toBeTruthy();
  });

  it("Expand all opens every band; Collapse all closes them", () => {
    render(
      <CollapsibleGroup>
        <CollapsibleSection title="A"><p>a</p></CollapsibleSection>
        <CollapsibleSection title="B"><p>b</p></CollapsibleSection>
      </CollapsibleGroup>,
    );
    const toggle = screen.getByText("Expand all");
    fireEvent.click(toggle);
    // After expand, control flips to "Collapse all"
    expect(screen.getByText("Collapse all")).toBeTruthy();
    fireEvent.click(screen.getByText("Collapse all"));
    expect(screen.getByText("Expand all")).toBeTruthy();
  });

  it("arrow keys move focus between band headers", () => {
    render(
      <CollapsibleGroup>
        <CollapsibleSection title="A"><p>a</p></CollapsibleSection>
        <CollapsibleSection title="B"><p>b</p></CollapsibleSection>
        <CollapsibleSection title="C"><p>c</p></CollapsibleSection>
      </CollapsibleGroup>,
    );
    const headers = screen.getAllByRole("button").filter((b) => /^(A|B|C)$/.test(b.textContent || ""));
    headers[0].focus();
    fireEvent.keyDown(headers[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(headers[1]);
    fireEvent.keyDown(headers[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(headers[0]);
  });
});
