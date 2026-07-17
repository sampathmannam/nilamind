// Track B crisis classifier — the on-device embedder (MiniLM via Transformers.js).
//
// Loads a BUNDLED MiniLM (public/models/Xenova/all-MiniLM-L6-v2) and runs it fully OFFLINE in the WebView —
// no network, matching NilaMind's privacy promise. Produces the normalized 384-dim sentence embedding the
// logistic-regression head in crisisClassifier.ts expects. Lazy singleton: Transformers.js + the model load
// only on the FIRST crisis-gate check, so there's zero app-startup cost. Any load/inference error throws and
// detectCrisis() catches it → degrades to the keyword scanner (fail-closed, never worse than before).
//
// 2026-07-16 REVERTED runtime-download of the ONNX Runtime WASM binary (was: onDeviceAssets.ts +
// wasmPaths object form) back to fully bundled. That change shipped in v1.18.6 and correlated with a false
// crisis-classifier trigger on an innocuous message ("I'm going to exercise") — scoreCrisis() only validates
// the embedding's LENGTH (384), not its correctness, so a subtly wrong WASM runtime load can produce a
// wrong-but-correctly-shaped embedding that silently feeds garbage into the logistic-regression head instead
// of throwing. Root cause not yet isolated; reverting to the known-good bundled path is the safe move for a
// safety-critical classifier. This means the app once again ships a prebuilt .wasm in its source tree, which
// will fail F-Droid's build scanner for this one file — accepted trade until the download path is re-verified.
import type { Embedder } from "./crisisClassifier";

let _pipe: unknown = null;
let _loading: Promise<unknown> | null = null;

async function getPipe(): Promise<unknown> {
  if (_pipe) return _pipe;
  if (!_loading) {
    _loading = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // OFFLINE ONLY — bundled model + wasm, never the network.
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.localModelPath = "/models/"; // public/models → served at the app root
      // onnxruntime-web: serve the wasm from the bundle, SINGLE-THREADED. The Capacitor WebView is not
      // cross-origin-isolated (no SharedArrayBuffer), so multi-threaded wasm would fail to start.
      const wasmBackend = env.backends.onnx.wasm;
      if (wasmBackend) {
        wasmBackend.wasmPaths = "/ort/";
        wasmBackend.numThreads = 1;
        wasmBackend.proxy = false;
      }
      _pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        dtype: "q8", // the bundled model_quantized.onnx
        device: "wasm",
      });
      return _pipe;
    })();
  }
  return _loading;
}

// #31 (audit): 1-entry memo. Each companion turn embeds the SAME last-user message twice, serially, on the
// pre-LLM critical path — once for the §9 crisis classifier and once for psychoed RAG. Returning the cached
// vector for a repeated exact text skips a second single-threaded-wasm forward pass (~100–300ms) with no
// behavioural change (the model is deterministic). Bounded to one entry, so it can never grow.
let _lastText: string | null = null;
let _lastVec: number[] | null = null;

export const transformersEmbedder: Embedder = async (text: string) => {
  if (text === _lastText && _lastVec) return _lastVec;
  const pipe = (await getPipe()) as (t: string, o: object) => Promise<{ data: Float32Array }>;
  // MUST match training: mean-pooled + L2-normalized (the head was trained on these).
  const out = await pipe(text, { pooling: "mean", normalize: true });
  const vec = Array.from(out.data);
  _lastText = text;
  _lastVec = vec;
  return vec;
};

/** Eagerly warm the model (optional) so the first real crisis check isn't slowed by the cold load. */
export async function warmCrisisEmbedder(): Promise<void> {
  try {
    await transformersEmbedder("warmup");
  } catch {
    /* stays cold; detectCrisis falls back to keywords */
  }
}
