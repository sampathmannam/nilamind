// autoUpdate.test.ts
// Tests for the GitHub auto‑update flow. Mocks Capacitor plugins and the fetch API.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Capacitor plugins before importing the service.
vi.mock("@capacitor/app", () => ({
  App: {
    getInfo: vi.fn(),
  },
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Filesystem: {
    writeFile: vi.fn(() => Promise.resolve()),
    getUri: vi.fn(() => Promise.resolve({ uri: "content://dummy/update.apk" })),
  },
}));

vi.mock("@capacitor/app-launcher", () => ({
  AppLauncher: {
    launchApp: vi.fn(() => Promise.resolve()),
  },
}));

import { App } from "@capacitor/app";
import { Filesystem } from "@capacitor/filesystem";
import { AppLauncher } from "@capacitor/app-launcher";
import { checkForGitHubUpdate, setAutoUpdateEnabled } from "./autoUpdate";

let originalFetch: any;

beforeEach(() => {
  // Reset mocks before each test.
  vi.clearAllMocks();
  // Save original fetch and replace with a stub.
  originalFetch = (global as any).fetch;
});

afterEach(() => {
  // Restore the original fetch implementation and the default privacy posture.
  (global as any).fetch = originalFetch;
  // Auto-update is OFF by default (no egress unless explicitly opted in).
  setAutoUpdateEnabled(false);
});

/** Helper to stub global.fetch based on URL. */
function stubFetch(isNewer: boolean) {
  (global as any).fetch = vi.fn(async (url: string) => {
    if (url.includes("api.github.com")) {
      // GitHub release API response.
      return {
        ok: true,
        json: async () => ({
          tag_name: isNewer ? "v1.9.2" : "v1.9.1",
          assets: [{ name: "nilamind.apk", browser_download_url: "https://example.com/nilamind.apk" }],
        }),
      };
    }
    // APK download response.
    return {
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new Uint8Array([0, 1, 2, 3]).buffer,
      }),
    };
  });
}

describe("checkForGitHubUpdate – auto‑update flow", () => {
  it("performs NO network calls when auto-update is disabled (privacy default)", async () => {
    vi.mocked(App.getInfo).mockResolvedValue({ version: "1.9.1" } as any);
    stubFetch(true); // a newer version exists, but the flag is off

    await checkForGitHubUpdate();

    // Disabled by default -> no GitHub API call, no APK download, no install.
    expect((global as any).fetch).not.toHaveBeenCalled();
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
    expect(AppLauncher.launchApp).not.toHaveBeenCalled();
  });

  it("downloads and launches when a newer version is available AND opted in", async () => {
    setAutoUpdateEnabled(true); // explicitly opt in for this test
    // Simulate an installed version older than the latest release.
    vi.mocked(App.getInfo).mockResolvedValue({ version: "1.9.1" } as any);
    stubFetch(true);

    await checkForGitHubUpdate();

    // Verify the GitHub API was queried.
    expect((global as any).fetch).toHaveBeenCalledTimes(2);

    // Verify the APK was written to the app's data directory.
    expect(Filesystem.writeFile).toHaveBeenCalledOnce();
    const writeArgs = (Filesystem.writeFile as any).mock.calls[0][0];
    expect(writeArgs.path).toBe("update_v1.9.2.apk");
    expect(writeArgs.directory).toBe("DATA");

    // Verify the installer intent was launched.
    expect(AppLauncher.launchApp).toHaveBeenCalledOnce();
    const launchArgs = (AppLauncher.launchApp as any).mock.calls[0][0];
    expect(launchArgs.uri).toBe("content://dummy/update.apk");
    expect(launchArgs.mimeType).toBe("application/vnd.android.package-archive");
  });

  it("does nothing when the installed version is up‑to‑date (opted in)", async () => {
    setAutoUpdateEnabled(true);
    vi.mocked(App.getInfo).mockResolvedValue({ version: "1.9.2" } as any);
    stubFetch(false);

    await checkForGitHubUpdate();

    // Only the release API is called; no APK download.
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
    expect(AppLauncher.launchApp).not.toHaveBeenCalled();
  });
});
