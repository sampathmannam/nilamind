// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import Section, { SectionDivider } from "./Section";

describe("Section", () => {
  it("renders title and children", () => {
    render(<Section title="My Section"><p>content</p></Section>);
    expect(screen.getByText("My Section")).toBeTruthy();
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("renders action element", () => {
    render(<Section title="Test" action={<button>Action</button>}>content</Section>);
    expect(screen.getByText("Action")).toBeTruthy();
  });

  it("renders icon when provided", () => {
    render(
      <Section title="With Icon" icon={<span data-testid="icon">★</span>}>
        content
      </Section>,
    );
    expect(screen.getByTestId("icon")).toBeTruthy();
    expect(screen.getByText("With Icon")).toBeTruthy();
  });

  it("renders without icon", () => {
    const { container } = render(<Section title="No Icon">content</Section>);
    expect(screen.getByText("No Icon")).toBeTruthy();
    expect(container.querySelector("[data-testid='icon']")).toBeNull();
  });

  it("is a semantic <section>", () => {
    const { container } = render(<Section title="Test">content</Section>);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("wraps children in a space-y-2 container", () => {
    const { container } = render(
      <Section title="T">
        <p>a</p>
        <p>b</p>
      </Section>,
    );
    const section = container.querySelector("section");
    const childDiv = section?.children[1] as HTMLElement;
    expect(childDiv?.className).toContain("space-y-2");
  });
});

describe("SectionDivider", () => {
  it("renders a labelled separator", () => {
    render(<SectionDivider label="Trends & measures" />);
    expect(screen.getByText("Trends & measures")).toBeTruthy();
    const sep = screen.getByRole("separator");
    expect(sep.getAttribute("aria-label")).toBe("Trends & measures");
  });

  it("is not a wrapping <section>", () => {
    const { container } = render(<SectionDivider label="X" />);
    expect(container.querySelector("section")).toBeNull();
  });
});

