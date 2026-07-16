// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import CrisisHelpButton from "./CrisisHelpButton";

afterEach(cleanup);

// Regression: this is a generic, always-visible "In crisis right now? Get help" affordance shown
// on the pre-app gates (onboarding, PIN unlock, model download) — reachable by anyone tapping it
// for any reason, before the app knows anything about them. The panel header shouldn't presume
// they reached for a specific harmful means (mirrors the same fix in CrisisOverlay).
describe("CrisisHelpButton — panel header doesn't presume a specific harmful means", () => {
  it("opens a panel that validates being here without 'you reached for this'", () => {
    render(<CrisisHelpButton />);
    fireEvent.click(screen.getByText(/in crisis right now/i));
    expect(screen.queryByText(/you reached for this/i)).toBeNull();
    expect(screen.getByText(/support is here/i)).toBeTruthy();
  });
});
