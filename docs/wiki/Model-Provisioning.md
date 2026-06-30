# Model Provisioning

NilaMind ships **without** a language model — both because GGUF files are large and licensed separately, and because a crisis-capable app shouldn't ship a brain by default. There are two ways to get a model onto the device.

## First-run in-app download (for end users)

On first launch, if no valid model is on disk, the app shows a setup screen (`ModelSetupScreen`) offering to download Nila's brain. The flow (`src/services/modelCatalog.ts`, `modelDownload.ts`):

1. **Informed consent.** The card states the size (~2.5 GB) and warns to use Wi-Fi before anything downloads — no silent mobile-data burn.
2. **Streamed to a temp file.** The model is downloaded to a `*.part` file (streamed to disk, so the JS heap never holds it).
3. **Integrity-verified.** It is accepted **only if** the on-disk byte length **exactly** matches the catalog size *and* the file starts with the `GGUF` magic. This catches both a truncated transfer and the classic failure where an HTTP error page gets written to disk as the "model."
4. **Atomic install.** Only after verification is it atomically renamed into place. Any failure deletes the partial, so a half-finished file can never silently become the brain.
5. **Self-healing.** On later launches, a file that's present but the wrong size is deleted and the setup screen re-offers a clean download — there's no one-way "bricked" state.

The catalog currently lists a single model — the fine-tuned 4B — fetched from the project's public Hugging Face repo. The model is under the **Gemma license** (not a free/open-source license); that's the one "non-free" aspect of an otherwise fully-FOSS app (see [Distribution](Distribution.md)).

## Side-loading (for developers)

You can skip the in-app download and push a GGUF directly:

```bash
adb push your-model.gguf \
  /sdcard/Android/data/com.nilamind.app/files/v2-4b-Q4_K_M.gguf
```

`llamaCppLlmAdapter.ts` looks for that filename in the app's external files dir. (If you use a different filename, point the adapter/catalog at it.)

## Bring your own model

NilaMind runs whatever on-device model you give it:

- On device, replies come from **any GGUF** you supply (e.g. a Gemma-3-4B-Instruct GGUF). Swap the file and you swap the brain.
- The seam is `src/services/localLlm.ts` (see [Architecture](Architecture.md)), so you can also wire a different on-device backend entirely.

> ⚠️ **Re-test [§9](Crisis-Safety.md) against your model before any real use.** A small or poorly-aligned model can produce unsafe, wrong, or distressing output; the safety layer reduces but does not eliminate that risk.

## Desktop development (no phone)

For iterating on the UI and logic on a laptop, register the Ollama backend (`ollamaLlmAdapter.ts`) and point it at a local model:

```bash
ollama pull qwen2.5:7b      # or any local model
npm run dev                 # the dev build wires Ollama as the backend
```

This block is tree-shaken out of production builds.
