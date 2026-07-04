# NilaMind speed plan — make the CURRENT 4B fast (no model change)

> Decision (2026-07-04): the on-device brain (Gemma-3-4B) stays. Quality is satisfactory. The ONLY goal is
> speed. This is an **app-engineering** problem, not a model problem.

## The problem, precisely (device-verified)

The slow reply is **model LOADING, not inference.**
- First reply on a fresh app process: **~2.5+ minutes.** Once loaded, decode is ~16 tok/s → warm replies are seconds.
- The cost is the **2.5 GB cold-load page-faulting off flash** (confirmed prior root-cause + the app's own copy: "the very first reply after setup can take a few minutes while Nila loads").
- **It recurs:** Android kills the app between uses (observed PID change 30381→1236 across a gap); every fresh process re-pays the full load. For an app opened intermittently, that's most sessions.

## Root cause in the binding (confirmed by code read)

`llama-cpp-capacitor` runs the load **synchronously on the Capacitor plugin thread**:
`LlamaCpp.java :: initContext()` → `initContextNative(modelPath, …)` blocks for the whole ~2.5 min.
That is why the removed pre-warm froze the app (the single-plugin-thread warm-starvation lesson). **But the
same file already backgrounds `downloadModel` with `new Thread(() -> { … })`** — the pattern we need is
already in the file; it just wasn't applied to the load.

## The plan (priority = dependency order)

1. **🔑 Async off-thread load (the enabler).** Wrap the `initContext` body in a background `Thread` (mirroring
   `downloadModel`). The JS API is unchanged (`initLlama` already resolves via the async callback). Persist via
   **patch-package** (add to the existing `postinstall`). **Feasibility: CONFIRMED by code inspection.** Nothing
   else works until this lands.
2. **Preload at app launch.** Once #1 makes load non-blocking, kick off `initLlama` when the app opens, hidden
   behind the ~15–20 s the user spends reading Nila's greeting → first real message is instant. (Load ONLY —
   do NOT run a background `completion()`; that was the original warm-starvation trigger.)
3. **Keep resident (bonus, not foundation).** A foreground service to reduce Android killing the process between
   sessions. Treat as a bonus — on a tight-RAM mid-range phone Android may still evict under pressure.
4. **Smaller quant (cheap, independent).** IQ4_XS ≈ 2.1 GB shaves ~15% off every load. Ships on its own; quality
   is already deemed fine, but re-run the §9 + voice checks.

Keep **Lever A** (short persona, already shipped) for prefill. Safety stays model-independent (§9 unchanged).

## Riskiest assumption → now validated

"Can the binding load off-thread without breaking the WebView bridge?" — validated by inspection (the download
path already threads). Remaining unknown = does threading `initContext` interact badly with a concurrent first
`completion()`? Mitigation: preload completes (promise resolves) before the first user message can trigger
completion; guard with an `isLoading` flag.

## Spike / test plan

1. Patch `initContext` → background thread (patch-package).
2. App: call `initLlama` on launch (fire-and-forget, behind an `isModelReady` flag; the chat "send" awaits it).
3. Rebuild, install, device-verify on ZD2232FCR5: (a) UI stays responsive during the ~2 min load, (b) the model
   is ready by the time the user finishes the greeting, (c) first message returns in **seconds**, not minutes.
4. If green: layer #4 (quant) and optionally #3 (foreground service).

## Spike results (2026-07-05, device-measured on ZD2232FCR5) — READ THIS

Ran the spike. Findings changed the picture:

1. **`use_mmap:false` is COUNTERPRODUCTIVE here — reverted.** It forces the full 2.5 GB to be read into RAM
   *upfront* at load; on this phone's flash that took **>4 min** (worse than mmap's lazy faulting). Do not use it.
2. **The real bottleneck is this phone's storage IO, not strategy.** ~2.5 GB at only **~10–20 MB/s** ≈ **2–4 min**
   to get the model into usable memory — mmap just moves *when* you pay it (deferred to first-inference faults)
   vs `use_mmap:false` (upfront). Either way the physics is the same: slow flash × a 2.5 GB file.
3. **This is substantially a SLOW-DEVICE problem.** On a flagship (UFS 3.x/4.0 ~1–2 GB/s) reading 2.5 GB is
   ~2–3 s and this pain largely disappears. The test Motorola ("vantage", eMMC-class) is near-worst-case.
4. **The async off-thread load patch works and is the right foundation** — it stops the load from freezing the
   plugin thread. But it's in `node_modules` (unpersisted); needs patch-package to survive `npm install`.

### Revised recommendation (given the IO reality)
- **#1 lever = keep-resident** (foreground service): the load cost is unavoidable, so pay it **once per reboot**
  and never let Android evict the process → every reply after the first stays fast. This is the only
  quality-preserving fix that meaningfully changes the felt experience. Pair with the async patch.
- **#2 = smaller file** only helps proportionally (IQ4_XS 2.1 GB ≈ −15%); a *dramatic* load win needs a much
  smaller model, which fails the quality bar — so it's not the answer given "keep the current model."
- **Set expectations:** on this specific phone, the very first reply per reboot will still cost ~2 min (reading
  the model off slow flash). Keep-resident makes every *subsequent* reply fast. A faster-storage phone is fast today.

## Explicitly NOT doing
- Swapping the model (quality is fine; a 4B-size Qwen wouldn't help load time anyway).
- Shrinking to a 1.7–3B (already failed the reliability bar).
- Running `completion()` in the background (the warm-starvation trap).
