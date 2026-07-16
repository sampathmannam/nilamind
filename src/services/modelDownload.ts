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
import { Sha256, b64ToBytes } from "./sha256";

const FILES_DIR = "/sdcard/Android/data/com.nilamind.app/files";

export interface DownloadProgress {
  receivedMB: number;
  totalMB: number;
  pct: number;
  // Which pass this sample belongs to. The byte transfer ("downloading") and the post-transfer SHA-256
  // integrity check ("verifying") are BOTH multi-minute on a real device, so the UI must be able to tell
  // them apart — otherwise the verify pass looks like a frozen 100% bar and reads as a hung app. Optional
  // so older callers that don't set it default to the download pass.
  phase?: "downloading" | "verifying";
}

const PREF_KEY = "nilamind_model_pref";
// If several models are ever on disk with no explicit choice saved, prefer the richest present.
// Derive from the catalog so a stored preference for a since-removed id (e.g. an old "best-4b") can't
// strand a freshly-swapped model: every catalog id is always reachable here.
const FALLBACK_ORDER = MODELS.map((m) => m.id);

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

/** Three-way size check, so callers can tell a transient stat FAILURE (file/dir not ready on a cold
 *  boot — must NOT delete) apart from a real size MISMATCH (a half-finished/corrupt file — safe to
 *  delete). "unknown" is the fail-safe: leave the file alone and retry later. */
type SizeState = "complete" | "mismatch" | "unknown";
async function sizeState(m: CatalogModel, filename: string): Promise<SizeState> {
  try {
    const stat = await Filesystem.stat({ path: filename, directory: Directory.External });
    return (stat.size ?? 0) === m.sizeBytes ? "complete" : "mismatch";
  } catch {
    // stat THREW — file missing, dir not mounted yet, or a transient storage hiccup. We do NOT know the
    // real size, so we must not treat this as corruption (deleting the real 2.5GB model on a cold-boot
    // hiccup is the failure this guards against).
    return "unknown";
  }
}

/** True only if the file on disk is COMPLETE — its byte length exactly matches the catalog size.
 *  A truncated download or a tiny error-body has a different length and is rejected. */
async function isComplete(m: CatalogModel, filename: string): Promise<boolean> {
  return (await sizeState(m, filename)) === "complete";
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

/** A 64-char lowercase hex string (a REAL digest). When not provided or invalid, the SHA-256 check
 *  is skipped — this is intentional for models where the hash hasn't been verified yet. */
function isRealSha256(v: string | undefined): v is string {
  return typeof v === "string" && /^[0-9a-f]{64}$/i.test(v);
}

/** Chunk size for the streaming hash read. 8 MB keeps peak WebView memory bounded (base64 inflates the
 *  transferred payload ~1.33×, so ~11 MB per read) while keeping the number of bridge round-trips low. */
const HASH_CHUNK_BYTES = 8 * 1024 * 1024;

/** SHA-256 the file by reading it in bounded chunks (never the whole 2.5 GB at once) and return the
 *  lowercase hex digest. Throws if a chunk read fails (so the caller rejects the download rather than
 *  installing an unverified file). */
async function fileSha256(
  m: CatalogModel,
  filename: string,
  onProgress?: (p: DownloadProgress) => void,
): Promise<string> {
  const size = m.sizeBytes;
  const hasher = new Sha256();
  for (let offset = 0; offset < size; offset += HASH_CHUNK_BYTES) {
    const length = Math.min(HASH_CHUNK_BYTES, size - offset);
    const res = await Filesystem.readFile({ path: filename, directory: Directory.External, offset, length });
    if (typeof res.data !== "string") throw new Error("readFile returned non-string data during hashing");
    hasher.update(b64ToBytes(res.data));
    // Report the verify pass so the UI shows live movement instead of a frozen 100% bar. Emitted AFTER the
    // chunk is hashed so the count reflects work actually done.
    const done = Math.min(offset + length, size);
    onProgress?.({
      receivedMB: done / 1e6,
      totalMB: size / 1e6,
      pct: size ? Math.min(100, (done / size) * 100) : 100,
      phase: "verifying",
    });
  }
  return hasher.digestHex();
}

/** Verify the downloaded file's SHA-256 against the catalog's expected digest, IF one is set to a real
 *  hex value. When no digest is provided (or it's invalid), the check is skipped — this is intentional
 *  for models where the hash hasn't been verified yet. When a real digest IS present, a mismatch is a
 *  hard failure (a same-size poisoned GGUF that slipped past the byte-length + magic checks). */
async function verifySha256(
  m: CatalogModel,
  filename: string,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  if (!isRealSha256(m.sha256)) return; // placeholder / unset → skip (no-op)
  const actual = await fileSha256(m, filename, onProgress);
  if (actual.toLowerCase() !== m.sha256.toLowerCase()) {
    throw new Error("Downloaded model failed SHA-256 verification (hash mismatch).");
  }
}

/** The on-disk model to use — the user's saved choice first, then the richest present. A file that is
 *  present but the WRONG size (a half-finished or corrupt download) is deleted, not loaded, so the
 *  setup screen can re-offer a clean download instead of the app being silently brain-dead. A stat that
 *  merely THREW (dir not ready on a cold boot) is treated as not-installed-yet — the file is left in
 *  place to retry, never deleted, so a transient hiccup can't nuke the real 2.5GB model. */
export async function findInstalledModel(): Promise<CatalogModel | null> {
  const order = [getPreferredModelId(), ...FALLBACK_ORDER].filter(Boolean) as string[];
  const seen = new Set<string>();
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    const m = MODELS.find((x) => x.id === id);
    if (!m) continue;
    const state = await sizeState(m, m.filename);
    if (state === "complete") return m;

    // STARTUP SELF-HEAL (2026-07-06 audit #7): a download can finish byte-perfect but be killed during the
    // multi-minute in-JS SHA-256 verify, before the rename — orphaning a COMPLETE `.part`. Previously that was
    // invisible here, so the user was re-shown "Set up Nila" and the 2.5 GB sat unused (recovery only ran on a
    // manual re-tap). Promote a complete + GGUF-magic-valid `.part` in place, with NO user action and NO
    // re-download. We intentionally do NOT re-run the full SHA-256 here (it would hang app boot for minutes —
    // the very step that got interrupted): size-equality + GGUF magic already reject the realistic failures (a
    // truncated transfer and the ~137-byte HTML/401 error-body both have the wrong size/magic). The residual
    // gap — a same-size, valid-magic but content-different GGUF — needs an HTTPS MITM or a compromised pinned HF
    // repo, and only on this rare recovery path; that trade beats a silent multi-minute boot hang.
    const part = `${m.filename}.part`;
    if ((await sizeState(m, part)) === "complete" && (await hasValidHeader(m, part))) {
      try {
        await tryDelete(m.filename); // clear any stale/wrong-size final, then move the recovered file into place
        await Filesystem.rename({ from: part, to: m.filename, directory: Directory.External });
        return m;
      } catch {
        /* rename hiccup — leave the .part intact and fall through; a manual download can still recover it */
      }
    }

    // Only a CONFIRMED wrong size is corrupt/partial → reclaim the space so a re-download starts clean.
    // "unknown" (stat threw) is left untouched: don't delete a possibly-real model on a storage hiccup.
    if (state === "mismatch") await tryDelete(m.filename);
  }
  return null;
}

/** Verify a fully-downloaded `.part` (exact size, GGUF magic, and SHA-256 if the catalog carries one),
 *  then atomically rename it into place as the real model. Throws (leaving the caller to clean up the
 *  partial) if any check fails. Shared by the normal download path AND the recovery path in downloadModel.
 *
 *  This step is the slow one: verifySha256 streams the whole 2.5 GB back over the bridge in bounded chunks
 *  and hashes it in JS, taking minutes. If the app is killed/backgrounded mid-verify the rename never runs
 *  and the complete `.part` is left on disk — which downloadModel now RECOVERS instead of re-downloading. */
async function verifyPart(
  model: CatalogModel,
  part: string,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  if (!(await isComplete(model, part))) {
    throw new Error("Downloaded file is incomplete (size mismatch).");
  }
  if (!(await hasValidHeader(model, part))) {
    throw new Error("Downloaded file is not a valid model.");
  }
  // Cryptographic integrity: if the catalog carries a real SHA-256, verify the .part against it before it
  // can become the brain (defends a same-size poisoned GGUF). No-op while the digest is the placeholder.
  // Reads the 2.5 GB file in bounded chunks — never all at once (WebView OOM). Streams `verifying`
  // progress so the multi-minute pass never presents as a frozen bar.
  await verifySha256(model, part, onProgress);
}

/** Stream-download a model to a temp path, verify it, then atomically move it into place.
 *
 *  RECOVERY: finalizePart (verify + rename) takes minutes on a 2.5 GB file, and if the app is killed or
 *  backgrounded in that window the transfer finishes but the rename never runs — leaving a COMPLETE `.part`
 *  behind. Re-downloading 2.5 GB in that case is wasteful and, on a flaky/throttled link, may never
 *  succeed (it can loop forever). So a complete `.part` is finalized in place with NO re-transfer; only a
 *  genuinely half-finished partial is cleared before a fresh download. */
export async function downloadModel(
  model: CatalogModel,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  const part = `${model.filename}.part`;
  const pre = await sizeState(model, part);

  // A CONFIRMED wrong-size partial is a stale/half-finished attempt → clear it so the transfer restarts
  // clean. "complete" is recovered below (not re-downloaded). "unknown" (no `.part` — the normal first-run
  // case) falls through to a fresh download.
  if (pre === "mismatch") await tryDelete(part);

  let sub: { remove: () => Promise<void> } | null = null;
  let verified = false; // once true, the .part is SHA-verified — a later rename failure must not delete it
  try {
    if (pre === "complete") {
      // The bytes are already on disk from a prior (interrupted) attempt — skip the multi-GB transfer and
      // go straight to verify + install. Report 100% so the UI doesn't sit at a stale percentage.
      onProgress?.({ receivedMB: model.sizeBytes / 1e6, totalMB: model.sizeBytes / 1e6, pct: 100, phase: "downloading" });
    } else {
      if (onProgress) {
        const total = model.sizeBytes; // catalog size: the native `contentLength` overflows Int for >2.1GB
        sub = await Filesystem.addListener("progress", (e) => {
          // NOTE: do NOT filter on `e.url === model.url`. The HuggingFace `resolve/main` URL 302-redirects
          // to a CDN host, so the progress events carry the (different) CDN URL and an exact match
          // suppressed EVERY event → a frozen 0% bar for the whole multi-GB download. Only one download
          // runs at a time (downloadModel is not re-entrant and the setup UI gates it), so there's nothing
          // to disambiguate. Native emits `bytes` as a 32-bit Int; for a >2.1GB file it wraps negative —
          // recover unsigned.
          let received = e.bytes;
          if (received < 0) received += 0x100000000;
          onProgress({
            receivedMB: received / 1e6,
            totalMB: total / 1e6,
            pct: total ? Math.min(100, Math.max(0, (received / total) * 100)) : 0,
            phase: "downloading",
          });
        });
      }
      await Filesystem.downloadFile({
        url: model.url,
        path: part,
        directory: Directory.External,
        progress: true,
      });
    }
    await verifyPart(model, part, onProgress); // size + magic + SHA — throws (→ catch deletes) if the .part is bad
    // From here the .part is VERIFIED-GOOD. A failure in the rename below must NOT delete it (2026-07-06
    // audit #9): a transient rename hiccup would otherwise destroy a byte-perfect, SHA-matched 2.5 GB model
    // and force a full re-download. A verified .part is recoverable by findInstalledModel's startup self-heal,
    // so we leave it in place and only surface the error.
    verified = true;
    await tryDelete(model.filename); // remove any old/partial final, then move the verified file into place
    await Filesystem.rename({ from: part, to: model.filename, directory: Directory.External });
  } catch (e) {
    // Only reclaim a NOT-yet-verified partial. A verified .part (rename-phase failure) is kept for recovery.
    if (!verified) await tryDelete(part);
    throw e;
  } finally {
    await sub?.remove();
  }
}

/** Register the native backend for a model that's on disk. Uses the CPU llama-cpp-capacitor adapter
 *  (llama.cpp over the GGUF, CPU-only) — the reliable, no-crash transport.
 *
 *  A Vulkan GPU path was tried and REMOVED: on the target Adreno GPU it failed to compile the compute
 *  shaders → VK_ERROR_DEVICE_LOST → an uncaught vk::DeviceLostError aborted the whole process on the first
 *  completion (a native SIGABRT no JS/Kotlin try/catch can trap). It also shipped ~97 MB of prebuilt .so
 *  with no in-repo build source. If GPU acceleration is revisited, it needs DeviceLost handling in the
 *  native JNI layer plus on-device validation on real target hardware before it goes anywhere near users. */
export async function registerDownloadedBackend(model: CatalogModel): Promise<void> {
  const path = `${FILES_DIR}/${model.filename}`;
  if (model.runtime !== "gguf") {
    throw new Error(`Unsupported model runtime "${model.runtime}" — only "gguf" (llama.cpp) ships today.`);
  }
  const { createLlamaCppBackend } = await import("./llamaCppLlmAdapter");
  registerLocalLlmBackend(createLlamaCppBackend(path, undefined, model.promptFormat));
}
