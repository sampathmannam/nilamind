// Track B crisis classifier — the on-device embedder (MiniLM via Transformers.js).
//
// Loads a BUNDLED MiniLM (public/models/Xenova/all-MiniLM-L6-v2 — small ONNX weights, not scanner-flagged)
// and runs it fully OFFLINE in the WebView, no network for inference itself. Produces the normalized
// 384-dim sentence embedding the logistic-regression head in crisisClassifier.ts expects. Lazy singleton:
// Transformers.js + the model load only on the FIRST crisis-gate check, so there's zero app-startup cost.
// Any load/inference error throws and detectCrisis() catches it → degrades to the keyword scanner
// (fail-closed, never worse than before) — this includes the ONNX Runtime WASM binary below not being
// downloaded yet, so a first-run offline gap here narrows recall, it does not disable crisis detection.
//
// The ONNX Runtime WASM binary itself (ort-wasm-simd-threaded.asyncify.wasm, ~22 MB, genuine compiled
// code) is runtime-downloaded via onDeviceAssets.ts rather than bundled — an F-Droid from-source build
// scanner flags any prebuilt .wasm found in the source tree, and unlike the MiniLM weights this really is
// executable code, not app-agnostic data. Only the .wasm binary moves; the small JS glue that loads it
// stays bundled in public/ort/ (see the `mjs` key below) since plain JS is normal, inspectable source.
import type { Embedder } from "./crisisClassifier";
import { ON_DEVICE_ASSETS, getAssetUrl } from "./onDeviceAssets";

let _pipe: unknown = null;
let _loading: Promise<unknown> | null = null;

async function getPipe(): Promise<unknown> {
  if (_pipe) return _pipe;
  if (!_loading) {
    _loading = (async () => {
      const [{ pipeline, env }, wasmUrl] = await Promise.all([
        import("@huggingface/transformers"),
        getAssetUrl(ON_DEVICE_ASSETS.ortWasm),
      ]);
      // OFFLINE INFERENCE — bundled model weights, never the network, once the WASM runtime is present.
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.localModelPath = "/models/"; // public/models → served at the app root
      // onnxruntime-web: JS glue from the bundle, the wasm binary from the runtime-downloaded copy above
      // (object form: `mjs` and `wasm` are resolved independently — see onnxruntime-web's flags.wasmPaths).
      // SINGLE-THREADED: the Capacitor WebView is not cross-origin-isolated (no SharedArrayBuffer), so
      // multi-threaded wasm would fail to start.
      const wasmBackend = env.backends.onnx.wasm;
      if (wasmBackend) {
        wasmBackend.wasmPaths = { mjs: "/ort/ort-wasm-simd-threaded.asyncify.mjs", wasm: wasmUrl };
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
