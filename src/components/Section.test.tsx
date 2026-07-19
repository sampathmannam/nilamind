// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import Section from "./Section";

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

  it("is a semantic <section>", () => {
    const { container } = render(<Section title="Test">content</Section>);
    expect(container.querySelector("section")).toBeTruthy();
  });
});
