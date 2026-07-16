// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import SoundPlayer from "./SoundPlayer";

afterEach(cleanup);

// Regression (device screenshot, 2026-07-15): the ambient-sounds screen showed the header TWICE —
// "Ambient sounds ✕" from the app's <Sheet> chrome, then a second "Ambient sounds / Generated
// on-device…" ✕ from SoundPlayer's own header. SoundPlayer is always mounted inside a <Sheet>
// (App.tsx: renderAuxView → Sheet title="Ambient sounds" + close), so it must NOT render its own
// duplicate title or close button. It should keep only the unique on-device privacy caption.
describe("SoundPlayer — no duplicate Sheet chrome", () => {
  it("does not render its own 'Ambient sounds' title (the Sheet already supplies it)", () => {
    render(<SoundPlayer />);
    expect(screen.queryByText("Ambient sounds")).toBeNull();
  });

  it("does not render its own close button even when onClose is provided (the Sheet supplies close)", () => {
    render(<SoundPlayer onClose={() => {}} />);
    const closeByLabel = screen.queryByRole("button", { name: /close/i });
    expect(closeByLabel).toBeNull();
  });

  it("keeps the unique on-device privacy caption", () => {
    render(<SoundPlayer />);
    expect(screen.queryByText(/Generated on-device — no files, no network/i)).not.toBeNull();
  });
});

// Regression (device screenshot, 2026-07-16): the noise-type grid, volume %, and "60 min" auto-stop
// button rendered flush against the right screen edge (truncated descriptions, clipped button) because
// SoundPlayer's root lacked the `max-w-md mx-auto` every sibling aux-view screen uses (ReachOutScreen,
// GroundingLibraryScreen, ...) to keep content within a safe, centered width on this device's viewport.
describe("SoundPlayer — matches sibling aux-view screens' width constraint", () => {
  it("root container has max-w-md and mx-auto, like every other aux-view screen", () => {
    const { container } = render(<SoundPlayer />);
    const root = container.querySelector("#sound-player");
    expect(root?.className).toMatch(/\bmax-w-md\b/);
    expect(root?.className).toMatch(/\bmx-auto\b/);
  });
});
