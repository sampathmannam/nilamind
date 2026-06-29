// Track B crisis classifier — the on-device embedder (MiniLM via Transformers.js).
//
// Loads a BUNDLED MiniLM (public/models/Xenova/all-MiniLM-L6-v2) and runs it fully OFFLINE in the WebView —
// no network, matching NilaMind's privacy promise. Produces the normalized 384-dim sentence embedding the
// logistic-regression head in crisisClassifier.ts expects. Lazy singleton: Transformers.js + the model load
// only on the FIRST crisis-gate check, so there's zero app-startup cost. Any load/inference error throws and
// detectCrisis() catches it → degrades to the keyword scanner (fail-closed, never worse than before).
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
      env.backends.onnx.wasm.wasmPaths = "/ort/";
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      _pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        dtype: "q8", // the bundled model_quantized.onnx
        device: "wasm",
      });
      return _pipe;
    })();
  }
  return _loading;
}

export const transformersEmbedder: Embedder = async (text: string) => {
  const pipe = (await getPipe()) as (t: string, o: object) => Promise<{ data: Float32Array }>;
  // MUST match training: mean-pooled + L2-normalized (the head was trained on these).
  const out = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
};

/** Eagerly warm the model (optional) so the first real crisis check isn't slowed by the cold load. */
export async function warmCrisisEmbedder(): Promise<void> {
  try {
    await transformersEmbedder("warmup");
  } catch {
    /* stays cold; detectCrisis falls back to keywords */
  }
}
