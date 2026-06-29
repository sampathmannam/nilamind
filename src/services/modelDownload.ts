// First-run model provisioning — downloads the on-device model from HuggingFace into the app's external
// files dir (streamed to disk, no JS-heap blowup), VERIFIES it, then registers the native backend. This
// replaces the adb side-load so a real install gets a working brain. §9 stays model-independent.
//
// Integrity matters more here than almost anywhere — a wrong/partial brain in a mental-health app is the
// worst failure mode. So the file is streamed to a `.part` temp, and is only accepted if BOTH:
//   1. its on-disk byte length EXACTLY equals the catalog size (catches a truncated transfer AND the
//      ~137-byte HTML/401 error-body that a naive `size > 0` check would happily load as a "model"), and
//   2. (GGUF) it starts with the "GGUF" magic.
// Only then is it atomically renamed into place. Any failure deletes the partial, so a half-finished
// download can never sit at the real path and silently become the brain (no one-way "bricked" trap).
import { Filesystem, Directory } from "@capacitor/filesystem";
import { MODELS, type CatalogModel } from "./modelCatalog";
import { registerLocalLlmBackend } from "./localLlm";

const FILES_DIR = "/sdcard/Android/data/com.nilamind.app/files";

export interface DownloadProgress {
  receivedMB: number;
  totalMB: number;
  pct: number;
}

const PREF_KEY = "nilamind_model_pref";
// If several models are ever on disk with no explicit choice saved, prefer the richest present.
const FALLBACK_ORDER = ["best-4b"];

export function getPreferredModelId(): string | null {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}
export function setPreferredModelId(id: string): void {
  try {
    localStorage.setItem(PREF_KEY, id);
  } catch {
    /* ignore */
  }
}

async function tryDelete(filename: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: filename, directory: Directory.External });
  } catch {
    /* already gone */
  }
}

/** True only if the file on disk is COMPLETE — its byte length exactly matches the catalog size.
 *  A truncated download or a tiny error-body has a different length and is rejected. */
async function isComplete(m: CatalogModel, filename: string): Promise<boolean> {
  try {
    const stat = await Filesystem.stat({ path: filename, directory: Directory.External });
    return (stat.size ?? 0) === m.sizeBytes;
  } catch {
    return false;
  }
}

/** GGUF files begin with the ASCII magic "GGUF" (0x47 0x47 0x55 0x46). We read just the first 4 bytes
 *  (Android honors offset/length, so this never pulls the multi-GB file into memory). */
async function hasValidHeader(m: CatalogModel, filename: string): Promise<boolean> {
  if (m.runtime !== "gguf") return true; // only GGUF magic is checked today
  try {
    const head = await Filesystem.readFile({
      path: filename,
      directory: Directory.External,
      offset: 0,
      length: 4,
    });
    if (typeof head.data !== "string") return false;
    return atob(head.data) === "GGUF"; // readFile returns base64 for binary
  } catch {
    return false;
  }
}

/** The on-disk model to use — the user's saved choice first, then the richest present. A file that is
 *  present but the WRONG size (a half-finished or corrupt download) is deleted, not loaded, so the
 *  setup screen can re-offer a clean download instead of the app being silently brain-dead. */
export async function findInstalledModel(): Promise<CatalogModel | null> {
  const order = [getPreferredModelId(), ...FALLBACK_ORDER].filter(Boolean) as string[];
  const seen = new Set<string>();
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    const m = MODELS.find((x) => x.id === id);
    if (!m) continue;
    if (await isComplete(m, m.filename)) return m;
    // Present but wrong size → corrupt/partial. Reclaim the space so a re-download starts clean.
    await tryDelete(m.filename);
  }
  return null;
}

/** Stream-download a model to a temp path, verify it, then atomically move it into place. */
export async function downloadModel(
  model: CatalogModel,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  const part = `${model.filename}.part`;
  await tryDelete(part); // clear any stale partial from a previous failed attempt

  let sub: { remove: () => Promise<void> } | null = null;
  if (onProgress) {
    const total = model.sizeBytes; // catalog size: the native `contentLength` overflows Int for >2.1GB
    sub = await Filesystem.addListener("progress", (e) => {
      if (e.url !== model.url) return;
      // Native emits `bytes` as a 32-bit Int; for a >2.1GB file it wraps negative — recover unsigned.
      let received = e.bytes;
      if (received < 0) received += 0x100000000;
      onProgress({
        receivedMB: received / 1e6,
        totalMB: total / 1e6,
        pct: total ? Math.min(100, Math.max(0, (received / total) * 100)) : 0,
      });
    });
  }

  try {
    await Filesystem.downloadFile({
      url: model.url,
      path: part,
      directory: Directory.External,
      progress: true,
    });
    if (!(await isComplete(model, part))) {
      throw new Error("Downloaded file is incomplete (size mismatch).");
    }
    if (!(await hasValidHeader(model, part))) {
      throw new Error("Downloaded file is not a valid model.");
    }
    await tryDelete(model.filename); // remove any old/partial final, then move the verified file into place
    await Filesystem.rename({ from: part, to: model.filename, directory: Directory.External });
  } catch (e) {
    await tryDelete(part); // never leave a partial at a path findInstalledModel might later trust
    throw e;
  } finally {
    await sub?.remove();
  }
}

/** Register the native backend for a model that's on disk (capgo for .task, llama.cpp for .gguf). */
export async function registerDownloadedBackend(model: CatalogModel): Promise<void> {
  const path = `${FILES_DIR}/${model.filename}`;
  if (model.runtime === "task") {
    const { createCapgoBackend } = await import("./capgoLlmAdapter");
    registerLocalLlmBackend(createCapgoBackend(path, model.id));
  } else {
    const { createLlamaCppBackend } = await import("./llamaCppLlmAdapter");
    registerLocalLlmBackend(createLlamaCppBackend(path));
  }
}
