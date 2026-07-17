// Runtime-downloaded on-device assets: currently just the Vosk speech-to-text model (voskStt.ts,
// wakeWord.ts). It's NOT bundled in the app package — it's fetched on first use, the same way the LLM is
// (modelDownload.ts), so the app's source tree never contains this prebuilt binary blob. (F-Droid's build
// scanner walks the whole source tree looking for exactly that — a checked-in .tgz — and rejects builds
// that fail from-source review; bundling it here would fail that review even though the model itself is
// unrelated to app code.) Device-verified 2026-07-16: downloads, verifies, and loads correctly on hardware.
//
// This mirrors modelDownload.ts's integrity model (exact byte-length + SHA-256 verification, atomic
// rename-into-place) but is intentionally NOT built on top of that file: these assets have no "which
// model is the brain" concept, no user-facing choice, and no native-backend registration step — callers
// just await a ready, fetchable URL. The two failure modes stay independent, so a bug in one path can't
// take down the other (the LLM download is the single most safety-critical piece of code in this app).
//
// The ONNX Runtime WASM binary used by the crisis classifier was ALSO on this runtime-download path
// (v1.18.6) but was reverted back to bundled after correlating with a false classifier trigger — see
// crisisEmbedder.ts's docstring. Don't re-add it here without re-verifying that root cause first.
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { Sha256, b64ToBytes } from "./sha256";

export interface OnDeviceAsset {
  id: string;
  filename: string;
  url: string;
  sizeBytes: number;
  sha256: string;
}

const RELEASE_BASE = "https://github.com/sampathmannam/nilamind/releases/download/ondevice-assets-v1";

export const ON_DEVICE_ASSETS = {
  voskStt: {
    id: "voskStt",
    filename: "vosk-model-small-en-us-0.15.tgz",
    url: `${RELEASE_BASE}/vosk-model-small-en-us-0.15.tgz`,
    sizeBytes: 41184862,
    sha256: "f0b24bb92a48ca575b6a96500d6b543f0f079c573dfe85bbe16001fc0404e1d8",
  },
} as const satisfies Record<string, OnDeviceAsset>;

async function statSize(filename: string): Promise<number | null> {
  try {
    const stat = await Filesystem.stat({ path: filename, directory: Directory.External });
    return stat.size ?? 0;
  } catch {
    return null; // not present (or dir not mounted yet on a cold boot) — treated as "not downloaded"
  }
}

/** True only if the asset is on disk with the EXACT expected byte length — rejects a half-finished or
 *  corrupt file the same way modelDownload.ts does for the LLM. */
export async function isAssetReady(asset: OnDeviceAsset): Promise<boolean> {
  return (await statSize(asset.filename)) === asset.sizeBytes;
}

const HASH_CHUNK_BYTES = 8 * 1024 * 1024;

async function fileSha256(asset: OnDeviceAsset, filename: string): Promise<string> {
  const hasher = new Sha256();
  for (let offset = 0; offset < asset.sizeBytes; offset += HASH_CHUNK_BYTES) {
    const length = Math.min(HASH_CHUNK_BYTES, asset.sizeBytes - offset);
    const res = await Filesystem.readFile({ path: filename, directory: Directory.External, offset, length });
    if (typeof res.data !== "string") throw new Error("readFile returned non-string data during hashing");
    hasher.update(b64ToBytes(res.data));
  }
  return hasher.digestHex();
}

async function tryDelete(filename: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: filename, directory: Directory.External });
  } catch {
    /* already gone */
  }
}

let _downloading = new Map<string, Promise<void>>();

/** Download, verify (byte-length + SHA-256), and atomically install an on-device asset. Safe to call
 *  concurrently for the same asset — callers share one in-flight download. No-ops if already installed.
 *
 *  Native only: Capacitor's Filesystem.downloadFile has no reliable web implementation, and the web/PWA
 *  build is not the shipped surface (see git history — removed as the public entry point). Failing fast
 *  and explicitly here (rather than letting an unsupported native call hang or throw an opaque error) is
 *  what actually matters for correctness: every caller sits behind a fail-closed catch already (STT checks
 *  Capacitor.isNativePlatform() itself; the crisis classifier degrades to the keyword floor on any error),
 *  so this only affects HOW FAST that fallback kicks in on web, not whether it does. */
export async function ensureAssetDownloaded(asset: OnDeviceAsset): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error(`On-device asset "${asset.id}" is only available on native platforms.`);
  }
  if (await isAssetReady(asset)) return;
  const inFlight = _downloading.get(asset.id);
  if (inFlight) return inFlight;

  const run = (async () => {
    const part = `${asset.filename}.part`;
    await tryDelete(part); // clear any stale partial from a previous failed attempt
    try {
      await Filesystem.downloadFile({ url: asset.url, path: part, directory: Directory.External });
      const size = await statSize(part);
      if (size !== asset.sizeBytes) {
        throw new Error(`Downloaded ${asset.filename} has wrong size (${size} != ${asset.sizeBytes})`);
      }
      const digest = await fileSha256(asset, part);
      if (digest.toLowerCase() !== asset.sha256.toLowerCase()) {
        throw new Error(`Downloaded ${asset.filename} failed SHA-256 verification`);
      }
      await tryDelete(asset.filename);
      await Filesystem.rename({ from: part, to: asset.filename, directory: Directory.External });
    } catch (e) {
      await tryDelete(part);
      throw e;
    }
  })();

  _downloading.set(asset.id, run);
  try {
    await run;
  } finally {
    _downloading.delete(asset.id);
  }
}

/** Resolve a ready, fetchable URL for an on-device asset — downloading it first if needed. Uses
 *  Capacitor's convertFileSrc, the standard supported way to expose a native filesystem file to the
 *  WebView (and to Web Workers within it, which both vosk-browser and onnxruntime-web's threaded backend
 *  use) without broadening file:// access. */
export async function getAssetUrl(asset: OnDeviceAsset): Promise<string> {
  await ensureAssetDownloaded(asset);
  const { uri } = await Filesystem.getUri({ path: asset.filename, directory: Directory.External });
  return Capacitor.convertFileSrc(uri);
}

// Exposed for tests only.
export function _resetDownloadingForTests(): void {
  _downloading = new Map();
}
