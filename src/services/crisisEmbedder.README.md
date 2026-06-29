# Crisis classifier — on-device embedder (the device-verify enable step)

The Track B §9 classifier (`crisisClassifier.ts`) is wired into the live send path (`sendToNila` →
`shouldBlockForCrisisAsync` → `detectCrisis`) but **OFF by default**: no embedder is injected and the master
flag is false, so `detectCrisis` returns exactly the keyword `scanForCrisis` result. The app builds and behaves
identically to before. This file is the drop-in to turn it on **after device-verification** — it is a `.md`
(not a `.ts`) on purpose so the heavy Transformers.js dependency is not required to build until you enable it.

## Why a separate embedder
`@capgo/capacitor-llm` (Gemma) is a singleton and its embeddings wouldn't match the MiniLM head we trained, so
the classifier needs its own tiny embedder: **MiniLM via Transformers.js**, running in the WebView, fully
offline (bundled model, no network). The head (`crisisClassifier.weights.json`) was trained on
`sentence-transformers/all-MiniLM-L6-v2` with **mean pooling + L2 normalize**, so the embedder must match that.

## Enable steps (do on-device, gated on verification)

1. **Install the dependency**
   ```bash
   npm i @huggingface/transformers
   ```

2. **Bundle the model OFFLINE** (privacy-first: never fetch user-adjacent data from the network).
   Download the quantized ONNX for `Xenova/all-MiniLM-L6-v2` and place it under the bundled assets
   (e.g. `public/models/Xenova/all-MiniLM-L6-v2/...`). Configure Transformers.js to use only local models
   (`env.allowRemoteModels = false`, `env.localModelPath = "/models/"`).

3. **Create `crisisEmbedder.ts`** with the implementation below, then inject it ONCE at app init (after a
   readiness/feature check), e.g. in `main.tsx`:
   ```ts
   import { setCrisisEmbedder, setCrisisClassifierEnabled } from "./services/crisisClassifier";
   import { transformersEmbedder } from "./services/crisisEmbedder";
   setCrisisEmbedder(transformersEmbedder);
   setCrisisClassifierEnabled(true); // flip ON only once device-verified
   ```

### `crisisEmbedder.ts` (drop-in)
```ts
import type { Embedder } from "./crisisClassifier";

// Lazy singleton: load MiniLM once, reuse. Fully offline (bundled ONNX). Fail-closed — any load/inference
// error surfaces as a thrown error that detectCrisis() catches and degrades to keyword-only.
let _pipe: unknown = null;
let _loading: Promise<unknown> | null = null;

async function getPipe() {
  if (_pipe) return _pipe;
  if (!_loading) {
    _loading = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowRemoteModels = false;        // OFFLINE only — never hit the network
      env.localModelPath = "/models/";      // bundled assets
      _pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      return _pipe;
    })();
  }
  return _loading;
}

export const transformersEmbedder: Embedder = async (text: string) => {
  const pipe = (await getPipe()) as (t: string, o: object) => Promise<{ data: Float32Array }>;
  const out = await pipe(text, { pooling: "mean", normalize: true }); // MUST match training
  return Array.from(out.data);
};
```

## Device-verify checklist (the gate to flipping the flag ON)
- [ ] Model loads in the Android WebView (cold-load time acceptable; cached after first use).
- [ ] `scoreCrisis()` on the 6 gut-check paraphrases ≥ threshold (parity with `train_production_head.py`
      sanity: 6/6 at threshold 0.5796). A few points of drift from int8 quantization is fine; re-check ≥ thr.
- [ ] Latency per send is acceptable (embedding adds ~tens of ms before the model call).
- [ ] With the model asset ABSENT, `detectCrisis` still works (keyword-only) and never throws — confirm the
      fail-closed path on a build without the bundled model.
- [ ] The crisis surface stays SOFT (offer + the existing §9 reply), never a hard hijack.

## Operating point
Threshold `0.5796` = earnest-FPR ~8%, additive recall ~89% (CV), 6/6 gut-check paraphrases. The full
FPR→threshold→recall sweep is in `crisisClassifier.weights.json` (`cv_threshold_sweep`) — retune there without
retraining. Rationale + the leak-free, adversarially-reviewed approach: `docs/NILA_AGENT_DESIGN.md`.
