// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../services/modelDownload", () => ({
  downloadModel: vi.fn(),
  registerDownloadedBackend: vi.fn(),
  setPreferredModelId: vi.fn(),
}));

import ModelSetupScreen from "./ModelSetupScreen";
import { getBrainStatus, setBrainStatus } from "../services/brainSetup";
import { isCloudApiEnabled, getCloudApiKey } from "../services/cloudApi";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  setBrainStatus("needs-setup");
});
afterEach(cleanup);

describe("ModelSetupScreen first-run choice", () => {
  it("shows the on-device and API cards plus skip, not the download screen, by default", () => {
    render(<ModelSetupScreen onReady={() => {}} />);
    expect(screen.getByText("On-device")).toBeTruthy();
    expect(screen.getByText("Cloud API key")).toBeTruthy();
    expect(screen.getByText(/Skip for now/)).toBeTruthy();
    expect(screen.queryByText("Nila's brain (fast)")).toBeNull();
  });

  it("choosing on-device shows the original download card and a Back link", () => {
    render(<ModelSetupScreen onReady={() => {}} />);
    fireEvent.click(screen.getByText("On-device"));
    expect(screen.getByText("Nila's brain (fast)")).toBeTruthy();
    expect(screen.getByText("← Back")).toBeTruthy();
  });

  it("Back from on-device returns to the choice screen", () => {
    render(<ModelSetupScreen onReady={() => {}} />);
    fireEvent.click(screen.getByText("On-device"));
    fireEvent.click(screen.getByText("← Back"));
    expect(screen.getByText("Cloud API key")).toBeTruthy();
  });

  it("choosing Cloud API key shows the provider form with Continue disabled until a key is entered", () => {
    render(<ModelSetupScreen onReady={() => {}} />);
    fireEvent.click(screen.getByText("Cloud API key"));
    const continueBtn = screen.getByText("Continue") as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText("gsk_…"), { target: { value: "gsk_onboardingtest" } });
    expect(continueBtn.disabled).toBe(false);
  });

  it("Continue persists the cloud API key, marks the brain ready, and calls onReady", () => {
    const onReady = vi.fn();
    render(<ModelSetupScreen onReady={onReady} />);
    fireEvent.click(screen.getByText("Cloud API key"));
    fireEvent.change(screen.getByPlaceholderText("gsk_…"), { target: { value: "gsk_onboardingtest" } });
    fireEvent.click(screen.getByText("Continue"));

    expect(isCloudApiEnabled()).toBe(true);
    expect(getCloudApiKey()).toBe("gsk_onboardingtest");
    expect(getBrainStatus()).toBe("ready");
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("Skip for now still marks the brain ready without configuring cloud", () => {
    const onReady = vi.fn();
    render(<ModelSetupScreen onReady={onReady} />);
    fireEvent.click(screen.getByText(/Skip for now/));
    expect(getBrainStatus()).toBe("ready");
    expect(isCloudApiEnabled()).toBe(false);
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});
