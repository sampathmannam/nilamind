import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// Mirrors modelDownload.test.ts's in-memory "disk" pattern (real bytes, so the chunked SHA-256 hasher
// sees actual content and offset/length reads behave like the real Filesystem plugin).
const h = vi.hoisted(() => ({
  files: new Map<string, { content: Uint8Array }>(),
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { External: "EXTERNAL" },
  Filesystem: {
    stat: vi.fn(async ({ path }: { path: string }) => {
      const f = h.files.get(path);
      if (!f) throw new Error("ENOENT");
      return { size: f.content.length };
    }),
    readFile: vi.fn(async ({ path, offset, length }: { path: string; offset?: number; length?: number }) => {
      const f = h.files.get(path);
      if (!f) throw new Error("ENOENT");
      const start = offset ?? 0;
      const end = length == null ? f.content.length : start + length;
      return { data: btoa(String.fromCharCode(...f.content.subarray(start, end))) };
    }),
    deleteFile: vi.fn(async ({ path }: { path: string }) => {
      h.files.delete(path);
    }),
    rename: vi.fn(async ({ from, to }: { from: string; to: string }) => {
      const f = h.files.get(from);
      if (!f) throw new Error("ENOENT");
      h.files.set(to, f);
      h.files.delete(from);
    }),
    downloadFile: vi.fn(async () => ({})),
    getUri: vi.fn(async ({ path }: { path: string }) => ({ uri: `file:///mock/${path}` })),
  },
}));

const h2 = vi.hoisted(() => ({ isNative: true }));
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => h2.isNative,
    convertFileSrc: (uri: string) => `capacitor://localhost/_capacitor_file_${uri.replace("file://", "")}`,
  },
}));

import { Filesystem } from "@capacitor/filesystem";
import {
  ON_DEVICE_ASSETS,
  isAssetReady,
  ensureAssetDownloaded,
  getAssetUrl,
  _resetDownloadingForTests,
  type OnDeviceAsset,
} from "./onDeviceAssets";

const CONTENT = new TextEncoder().encode("x".repeat(1000));
const TEST_ASSET: OnDeviceAsset = {
  id: "test",
  filename: "test-asset.bin",
  url: "https://example.com/test-asset.bin",
  sizeBytes: CONTENT.length,
  sha256: createHash("sha256").update(CONTENT).digest("hex"),
};

const writeContentOnDownload = (content: Uint8Array) =>
  vi.mocked(Filesystem.downloadFile).mockImplementation(async ({ path }: { path: string }) => {
    h.files.set(path, { content });
    return {} as never;
  });

describe("onDeviceAssets", () => {
  beforeEach(() => {
    h.files.clear();
    h2.isNative = true;
    _resetDownloadingForTests();
    vi.mocked(Filesystem.downloadFile).mockReset();
    writeContentOnDownload(CONTENT);
  });

  it("catalog entries have real 64-char hex SHA-256 digests", () => {
    for (const asset of Object.values(ON_DEVICE_ASSETS)) {
      expect(asset.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(asset.sizeBytes).toBeGreaterThan(0);
    }
  });

  it("isAssetReady is false when nothing is on disk", async () => {
    expect(await isAssetReady(TEST_ASSET)).toBe(false);
  });

  it("ensureAssetDownloaded downloads, verifies, and installs the asset", async () => {
    await ensureAssetDownloaded(TEST_ASSET);
    expect(await isAssetReady(TEST_ASSET)).toBe(true);
    expect(Filesystem.downloadFile).toHaveBeenCalledTimes(1);
    // installed at the final filename, not the `.part` temp
    expect(h.files.has(TEST_ASSET.filename)).toBe(true);
    expect(h.files.has(`${TEST_ASSET.filename}.part`)).toBe(false);
  });

  it("ensureAssetDownloaded is a no-op if the asset is already installed", async () => {
    await ensureAssetDownloaded(TEST_ASSET);
    vi.mocked(Filesystem.downloadFile).mockClear();
    await ensureAssetDownloaded(TEST_ASSET);
    expect(Filesystem.downloadFile).not.toHaveBeenCalled();
  });

  it("concurrent calls for the same asset share one download", async () => {
    const [a, b] = await Promise.all([
      ensureAssetDownloaded(TEST_ASSET),
      ensureAssetDownloaded(TEST_ASSET),
    ]);
    expect(a).toBeUndefined();
    expect(b).toBeUndefined();
    expect(Filesystem.downloadFile).toHaveBeenCalledTimes(1);
  });

  it("rejects and cleans up the partial on a SHA-256 mismatch", async () => {
    const badAsset = { ...TEST_ASSET, sha256: "0".repeat(64) };
    await expect(ensureAssetDownloaded(badAsset)).rejects.toThrow(/SHA-256/);
    expect(await isAssetReady(badAsset)).toBe(false);
    expect(h.files.has(`${badAsset.filename}.part`)).toBe(false); // partial cleaned up, not left dangling
  });

  it("rejects and cleans up the partial on a size mismatch", async () => {
    writeContentOnDownload(new TextEncoder().encode("short"));
    await expect(ensureAssetDownloaded(TEST_ASSET)).rejects.toThrow(/wrong size/);
    expect(h.files.has(`${TEST_ASSET.filename}.part`)).toBe(false);
  });

  it("getAssetUrl downloads (if needed) and returns a Capacitor-convertible URL", async () => {
    const url = await getAssetUrl(TEST_ASSET);
    expect(url).toContain("_capacitor_file_");
    expect(url).toContain(TEST_ASSET.filename);
  });

  it("rejects fast on non-native platforms without touching Filesystem", async () => {
    h2.isNative = false;
    await expect(ensureAssetDownloaded(TEST_ASSET)).rejects.toThrow(/native platforms/);
    expect(Filesystem.downloadFile).not.toHaveBeenCalled();
  });
});
