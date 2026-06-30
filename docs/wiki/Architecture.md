# Architecture

NilaMind is a **[Capacitor](https://capacitorjs.com) (Android) app wrapping a React/Vite web UI**. The UI and all product logic are TypeScript/React; the heavy, device-specific work (running the LLM, speech, biometrics, encrypted storage) is done by native Capacitor plugins. The guiding principle is **on-device everything** — nothing about a conversation touches the network.

## Stack

| Layer | Technology |
|---|---|
| UI | React 19, Tailwind CSS 4, Vite 6 |
| Shell | Capacitor 8 (Android) |
| On-device LLM | `llama-cpp-capacitor` (GGUF via llama.cpp) |
| Crisis classifier | ONNX Runtime Web + a bundled MiniLM (Transformers.js) |
| Speech | `@capacitor-community/speech-recognition`, `text-to-speech`; Vosk for wake-word |
| Storage | Dexie (IndexedDB), encrypted at rest via the app's `secureLocal` |
| Charts | Recharts |
| Identity | BIP39 (`@scure/bip39`) |

## The on-device brain seam

All "talk to a model" calls go through one small seam, `src/services/localLlm.ts`, so the brain is pluggable:

- `registerLocalLlmBackend(backend)` registers an implementation.
- A backend exposes `{ id, isReady, generate({ system, messages, onToken, signal }) }`.
- `isLocalLlmReady()` / `getLocalLlmBackend()` let the app degrade gracefully to a calm offline companion when no model is loaded.

Shipped backends:

- **`llamaCppLlmAdapter.ts`** — the production path: a GGUF model run by llama.cpp on the device (CPU).
- **`capgoLlmAdapter.ts`** — a MediaPipe `.task` path kept as an alternative runtime.
- **`ollamaLlmAdapter.ts`** — **desktop-dev only**: point the app at a local [Ollama](https://ollama.com) model so you can iterate on a laptop without a phone. Tree-shaken out of production builds.

## Module map

Roughly, `src/services/` groups into:

- **Brain & prompting** — `nila.ts` (Nila's persona + `buildNilaSystem`), `gemmaPrompt.ts` (the raw Gemma prompt builder), `localNila.ts` (the streaming generate path), `skillRetrieval.ts` / `skillsLibrary.ts` (the evidence-based skill corpus + retriever).
- **Safety (§9)** — `safety.ts` (the deterministic keyword scanner `scanForCrisis`), `crisisClassifier.ts` + `crisisEmbedder.ts` (the on-device semantic classifier), `crisisResources.ts`, `nilaSafetyGate.ts`. See [Crisis Safety (§9)](Crisis-Safety.md).
- **Memory & insight** — `nilaMemory.ts`, `nilaInsights.ts`, `nilaInflection.ts` (notices shifts in your own trajectory), `moodHistory.ts`, `patternInsights.ts`, `sleepInsight.ts`.
- **Features** — `pact.ts` (the "letter to my unwell self"), `dependencyGuard.ts`, `behaviouralActivation.ts`, `values.ts`/`valuesToAction.ts`, `psychoed.ts`, `windDown.ts`, `reachOut.ts`, `checkin.ts`, `assessments.ts`. See [Features](Features.md).
- **Voice** — `voice.ts`, `wakeWord.ts`, `afHeartVoice.ts`.
- **Storage & identity** — `secureLocal.ts` / `secureStore.ts` (encrypted store), `identity.ts` (BIP39), `biometricGate.ts`.
- **Provisioning** — `modelCatalog.ts`, `modelDownload.ts`, `brainSetup.ts`. See [Model Provisioning](Model-Provisioning.md).

## Request flow

```
User input (voice or text)
        │
        ▼
 §9 INPUT gate ───────────► if crisis: surface help + route to a human (model-independent)
        │ (clear)
        ▼
 buildNilaSystem(query)  =  persona + on-device memory context + relevant skills
        │
        ▼
 gemmaPrompt: fold system into a leading user turn + seed Nila's greeting + alternate turns
        │
        ▼
 localLlm backend  →  llama.cpp generates on-device (no network)
        │
        ▼
 §9 OUTPUT gate (applyOutputSafety on the full reply; live streaming guard)
        │
        ▼
 Render in chat + (optionally) speak aloud
```

## Why a WebView app?

Capacitor lets the same React codebase target Android today and other platforms later, while still reaching native capabilities (the LLM plugin, speech, biometrics, file system) through a typed bridge. The trade-offs that matter for NilaMind — notably that the Android llama.cpp binding runs generation synchronously on a single plugin thread, and doesn't stream per-token — are documented in [The On-Device Brain](The-On-Device-Brain.md).
