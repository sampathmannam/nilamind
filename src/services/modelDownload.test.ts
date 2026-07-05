import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// modelDownload.ts talks to @capacitor/filesystem (stat/readFile/rename/delete/downloadFile/progress).
// Back it with a tiny in-memory "disk" so the PURE integrity logic (size-equality, GGUF magic, atomic
// rename, partial cleanup, Int-overflow progress recovery, SHA-256) is testable in node without a device.
//
// Files are stored one of two ways:
//   • { size, magic }         — a LAZY stand-in for a multi-GB file (can't allocate 2.5 GB in a test): stat
//                               returns `size`, header reads return `magic`. Used by the size/magic/overflow
//                               tests, which run against a hash-less model so the SHA-256 pass is skipped.
//   • { content: Uint8Array } — REAL bytes, so `readFile` honours offset/length and the chunked SHA-256
//                               hasher sees the actual content. Used by the dedicated SHA-256 tests.
type MockFile = { size: number; magic: string; content?: Uint8Array };
const h = vi.hoisted(() => ({
  files: new Map<string, { size: number; magic: string; content?: Uint8Array }>(),
  lastListener: null as null | ((e: { url: string; bytes: number; contentLength: number }) => void),
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { External: "EXTERNAL" },
  Filesystem: {
    stat: vi.fn(async ({ path }: { path: string }) => {
      const f = h.files.get(path);
      if (!f) throw new Error("ENOENT");
      return { size: f.content ? f.content.length : f.size };
    }),
    readFile: vi.fn(async ({ path, offset, length }: { path: string; offset?: number; length?: number }) => {
      const f = h.files.get(path);
      if (!f) throw new Error("ENOENT");
      if (f.content) {
        const start = offset ?? 0;
        const end = length == null ? f.content.length : start + length;
        const slice = f.content.subarray(start, end);
        return { data: btoa(String.fromCharCode(...slice)) };
      }
      return { data: btoa(f.magic.slice(0, length ?? 4)) }; // lazy header-only read
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
// A model whose SHA-256 pass is skipped (undefined) — for the size/magic/overflow tests, which use a
// multi-GB `size` stand-in that has no real bytes to hash.
const modelNoHash = { ...model, sha256: undefined };
const PART = `${model.filename}.part`;

/** Make downloadFile "write" a lazy {size, magic} file of the given size + magic to the requested path. */
const writeOnDownload = (size: number, magic: string) =>
  vi.mocked(Filesystem.downloadFile).mockImplementation(async ({ path }: { path: string }) => {
    h.files.set(path, { size, magic });
    return {} as never;
  });

/** Make downloadFile "write" a REAL byte buffer (so SHA-256 sees actual content). */
const writeContentOnDownload = (content: Uint8Array) =>
  vi.mocked(Filesystem.downloadFile).mockImplementation(async ({ path }: { path: string }) => {
    h.files.set(path, { size: content.length, magic: String.fromCharCode(...content.subarray(0, 4)), content });
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

  it("does NOT delete a present file when stat THROWS (transient cold-boot hiccup, not corruption)", async () => {
    h.files.set(model.filename, { size: model.sizeBytes, magic: "GGUF" });
    vi.mocked(Filesystem.stat).mockRejectedValueOnce(new Error("storage not ready"));
    expect(await findInstalledModel()).toBeNull(); // treated as not-found (retry), NOT corrupt
    expect(h.files.has(model.filename)).toBe(true); // the real model is left intact
  });
});

describe("downloadModel — integrity (size / magic / progress)", () => {
  it("accepts a complete, valid GGUF and atomically renames it into place", async () => {
    writeOnDownload(model.sizeBytes, "GGUF");
    await expect(downloadModel(modelNoHash)).resolves.toBeUndefined();
    expect(h.files.has(model.filename)).toBe(true);
    expect(h.files.has(PART)).toBe(false); // temp consumed by the rename
  });

  it("rejects a TRUNCATED download and leaves no partial behind", async () => {
    writeOnDownload(1000, "GGUF"); // right magic, wrong (short) size
    await expect(downloadModel(modelNoHash)).rejects.toThrow(/incomplete|size/i);
    expect(h.files.has(PART)).toBe(false); // cleaned up
    expect(h.files.has(model.filename)).toBe(false); // never installed
  });

  it("rejects a right-size file that isn't a GGUF (wrong magic) and cleans up", async () => {
    writeOnDownload(model.sizeBytes, "<!DO"); // exact size, but an HTML-ish body, not GGUF
    await expect(downloadModel(modelNoHash)).rejects.toThrow(/not a valid model/i);
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
    await downloadModel(modelNoHash, onProgress);
    const sample = onProgress.mock.calls.map((c) => c[0] as { receivedMB: number; pct: number }).find((p) => p.pct > 50);
    expect(sample).toBeTruthy();
    expect(sample!.receivedMB).toBeCloseTo(2300, 0); // -1994967296 + 2^32 = 2,300,000,000 bytes
    expect(sample!.pct).toBeGreaterThan(90);
    expect(sample!.pct).toBeLessThanOrEqual(100); // not garbage from the negative contentLength
  });
});

describe("downloadModel — recovery of a complete-but-unfinalized partial", () => {
  it("finalizes an existing complete `.part` WITHOUT re-downloading (interrupted verify/rename)", async () => {
    // Simulate a prior attempt that fully downloaded but was killed before the rename: a complete `.part`
    // is already on disk. (Hash-less model so we exercise the size/magic recovery path.)
    h.files.set(PART, { size: modelNoHash.sizeBytes, magic: "GGUF" });
    await expect(downloadModel(modelNoHash)).resolves.toBeUndefined();
    expect(Filesystem.downloadFile).not.toHaveBeenCalled(); // no 2.5 GB re-transfer
    expect(h.files.has(model.filename)).toBe(true); // promoted into place
    expect(h.files.has(PART)).toBe(false);
  });

  it("reports 100% progress when recovering a complete `.part` (no stale bar)", async () => {
    h.files.set(PART, { size: modelNoHash.sizeBytes, magic: "GGUF" });
    const onProgress = vi.fn();
    await downloadModel(modelNoHash, onProgress);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ pct: 100 }));
  });

  it("clears a WRONG-SIZE partial and re-downloads clean (not treated as recoverable)", async () => {
    h.files.set(PART, { size: 1234, magic: "GGUF" }); // half-finished leftover
    writeOnDownload(modelNoHash.sizeBytes, "GGUF");
    await expect(downloadModel(modelNoHash)).resolves.toBeUndefined();
    expect(Filesystem.downloadFile).toHaveBeenCalled(); // fresh transfer happened
    expect(h.files.has(model.filename)).toBe(true);
  });

  it("rejects a complete-size but poisoned `.part` on recovery and cleans up (no re-download)", async () => {
    // A complete-size `.part` with real bytes whose hash won't match the catalog digest.
    const content = new Uint8Array([...Array.from("GGUF").map((c) => c.charCodeAt(0)), ...Array(2044).fill(0x41)]);
    const m = { ...model, sizeBytes: content.length, sha256: "f".repeat(64) };
    h.files.set(PART, { size: content.length, magic: "GGUF", content });
    await expect(downloadModel(m)).rejects.toThrow(/SHA-256|hash/i);
    expect(Filesystem.downloadFile).not.toHaveBeenCalled();
    expect(h.files.has(PART)).toBe(false); // poisoned partial reclaimed
    expect(h.files.has(model.filename)).toBe(false);
  });
});

describe("downloadModel — SHA-256 content verification", () => {
  // Real bytes: "GGUF" magic + filler, small enough to hash in-test. The catalog's real 2.5GB hash is
  // exercised on-device; here we verify the CHUNKED hasher accepts a matching digest and rejects a swap.
  const content = new Uint8Array([...Array.from("GGUF").map((c) => c.charCodeAt(0)), ...Array(2044).fill(0x41)]);
  const goodHash = createHash("sha256").update(content).digest("hex");

  it("accepts a download whose SHA-256 matches the catalog digest", async () => {
    writeContentOnDownload(content);
    const m = { ...model, sizeBytes: content.length, sha256: goodHash };
    await expect(downloadModel(m)).resolves.toBeUndefined();
    expect(h.files.has(model.filename)).toBe(true);
  });

  it("REJECTS a same-size, GGUF-magic-valid but poisoned model (hash mismatch) and cleans up", async () => {
    writeContentOnDownload(content); // valid size + magic, but…
    const m = { ...model, sizeBytes: content.length, sha256: "f".repeat(64) }; // …a hash it can't match
    await expect(downloadModel(m)).rejects.toThrow(/SHA-256|hash/i);
    expect(h.files.has(PART)).toBe(false); // partial reclaimed
    expect(h.files.has(model.filename)).toBe(false); // never installed
  });
});
