// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Sheet from "./Sheet";

afterEach(cleanup);

describe("Sheet", () => {
  it("renders the title and a close button when open", () => {
    render(
      <Sheet open title="Test Sheet" onClose={() => {}}>
        <p>body content</p>
      </Sheet>
    );
    expect(screen.getByText("Test Sheet")).toBeTruthy();
    expect(screen.getByLabelText("Close")).toBeTruthy();
    expect(screen.getByText("body content")).toBeTruthy();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <Sheet open={false} title="Hidden" onClose={() => {}}>
        <p>body content</p>
      </Sheet>
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Test Sheet" onClose={onClose}>
        <p>body</p>
      </Sheet>
    );
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Test Sheet" onClose={onClose}>
        <p>body</p>
      </Sheet>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exposes the title as the dialog aria-label", () => {
    render(
      <Sheet open title="My Dialog" onClose={() => {}}>
        <p>body</p>
      </Sheet>
    );
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe("My Dialog");
  });
});
