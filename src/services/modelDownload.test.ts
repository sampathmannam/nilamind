import { describe, it, expect, vi, beforeEach } from "vitest";

// modelDownload.ts talks to @capacitor/filesystem (stat/readFile/rename/delete/downloadFile/progress).
// Back it with a tiny in-memory "disk" so the PURE integrity logic (size-equality, GGUF magic, atomic
// rename, partial cleanup, Int-overflow progress recovery) is testable in node without a device.
const h = vi.hoisted(() => ({
  files: new Map<string, { size: number; magic: string }>(),
  lastListener: null as null | ((e: { url: string; bytes: number; contentLength: number }) => void),
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { External: "EXTERNAL" },
  Filesystem: {
    stat: vi.fn(async ({ path }: { path: string }) => {
      const f = h.files.get(path);
      if (!f) throw new Error("ENOENT");
      return { size: f.size };
    }),
    readFile: vi.fn(async ({ path, length }: { path: string; length?: number }) => {
      const f = h.files.get(path);
      if (!f) throw new Error("ENOENT");
      return { data: btoa(f.magic.slice(0, length ?? 4)) }; // readFile returns base64 for binary
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
    addListener: vi.fn(async (_event: string, cb: (e: { url: string; bytes: number; contentLength: number }) => void) => {
      h.lastListener = cb;
      return { remove: vi.fn(async () => {}) };
    }),
    downloadFile: vi.fn(async () => ({})),
  },
}));

vi.mock("./localLlm", () => ({ registerLocalLlmBackend: vi.fn() }));

import { Filesystem } from "@capacitor/filesystem";
import { findInstalledModel, downloadModel } from "./modelDownload";
import { MODELS } from "./modelCatalog";

const model = MODELS[0];
const PART = `${model.filename}.part`;

/** Make downloadFile "write" a file of the given size + magic to the requested path. */
const writeOnDownload = (size: number, magic: string) =>
  vi.mocked(Filesystem.downloadFile).mockImplementation(async ({ path }: { path: string }) => {
    h.files.set(path, { size, magic });
    return {} as never;
  });

beforeEach(() => {
  h.files.clear();
  h.lastListener = null;
  vi.clearAllMocks();
});

describe("findInstalledModel", () => {
  it("returns the model when a COMPLETE file is on disk (exact byte length)", async () => {
    h.files.set(model.filename, { size: model.sizeBytes, magic: "GGUF" });
    expect(await findInstalledModel()).toEqual(model);
  });

  it("deletes a WRONG-SIZE file and returns null — no corrupt brain, no one-way bricked trap", async () => {
    h.files.set(model.filename, { size: 12345, magic: "GGUF" });
    expect(await findInstalledModel()).toBeNull();
    expect(h.files.has(model.filename)).toBe(false); // reclaimed so a re-download starts clean
  });

  it("returns null when nothing is on disk", async () => {
    expect(await findInstalledModel()).toBeNull();
  });
});

describe("downloadModel — integrity", () => {
  it("accepts a complete, valid GGUF and atomically renames it into place", async () => {
    writeOnDownload(model.sizeBytes, "GGUF");
    await expect(downloadModel(model)).resolves.toBeUndefined();
    expect(h.files.has(model.filename)).toBe(true);
    expect(h.files.has(PART)).toBe(false); // temp consumed by the rename
  });

  it("rejects a TRUNCATED download and leaves no partial behind", async () => {
    writeOnDownload(1000, "GGUF"); // right magic, wrong (short) size
    await expect(downloadModel(model)).rejects.toThrow(/incomplete|size/i);
    expect(h.files.has(PART)).toBe(false); // cleaned up
    expect(h.files.has(model.filename)).toBe(false); // never installed
  });

  it("rejects a right-size file that isn't a GGUF (wrong magic) and cleans up", async () => {
    writeOnDownload(model.sizeBytes, "<!DO"); // exact size, but an HTML-ish body, not GGUF
    await expect(downloadModel(model)).rejects.toThrow(/not a valid model/i);
    expect(h.files.has(PART)).toBe(false);
    expect(h.files.has(model.filename)).toBe(false);
  });

  it("recovers the Int-overflow progress (negative bytes → unsigned) and ignores native contentLength", async () => {
    const onProgress = vi.fn();
    vi.mocked(Filesystem.downloadFile).mockImplementation(async ({ path }: { path: string }) => {
      // A progress sample as the native plugin emits it past ~2.1GB: `bytes` has wrapped negative and
      // `contentLength` is already negative from contentLength?.toInt() overflowing Int.MAX.
      h.lastListener?.({ url: model.url, bytes: -1994967296, contentLength: -1805073280 });
      h.files.set(path, { size: model.sizeBytes, magic: "GGUF" });
      return {} as never;
    });
    await downloadModel(model, onProgress);
    const sample = onProgress.mock.calls.map((c) => c[0] as { receivedMB: number; pct: number }).find((p) => p.pct > 50);
    expect(sample).toBeTruthy();
    expect(sample!.receivedMB).toBeCloseTo(2300, 0); // -1994967296 + 2^32 = 2,300,000,000 bytes
    expect(sample!.pct).toBeGreaterThan(90);
    expect(sample!.pct).toBeLessThanOrEqual(100); // not garbage from the negative contentLength
  });
});
