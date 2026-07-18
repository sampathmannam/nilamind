// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { useFocusTrap } from "./useFocusTrap";

afterEach(cleanup);

function Trap({ onClose, label }: { onClose: () => void; label: string }) {
  const ref = useFocusTrap<HTMLDivElement>(true, onClose);
  return (
    <div ref={ref} tabIndex={-1} data-testid={label}>
      <button>{label}-a</button>
      <button>{label}-b</button>
    </div>
  );
}

describe("useFocusTrap — stack-scoped Escape (2026-07-18 design review)", () => {
  it("a single open trap closes on Escape", () => {
    const onClose = vi.fn();
    render(<Trap onClose={onClose} label="solo" />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape closes ONLY the topmost trap, not the ones beneath it", () => {
    const lower = vi.fn();
    const upper = vi.fn();
    const { rerender } = render(<Trap onClose={lower} label="lower" />);
    // Stack a second dialog on top of the first.
    rerender(
      <>
        <Trap onClose={lower} label="lower" />
        <Trap onClose={upper} label="upper" />
      </>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
  });

  it("after the top trap unmounts, Escape falls through to the next one down", () => {
    const lower = vi.fn();
    const upper = vi.fn();
    const { rerender } = render(
      <>
        <Trap onClose={lower} label="lower" />
        <Trap onClose={upper} label="upper" />
      </>,
    );
    rerender(<Trap onClose={lower} label="lower" />); // close/unmount the top dialog
    fireEvent.keyDown(window, { key: "Escape" });
    expect(lower).toHaveBeenCalledTimes(1);
    expect(upper).not.toHaveBeenCalled();
  });

  it("ignores non-Escape/Tab keys", () => {
    const onClose = vi.fn();
    render(<Trap onClose={onClose} label="solo" />);
    fireEvent.keyDown(window, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
