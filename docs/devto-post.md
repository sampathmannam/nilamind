*How I built a mental health companion that never connects to the internet, and why the most important safety decisions have nothing to do with the AI.*

---

## The Problem

Mental health conversations are the most private conversations you can have. If you're telling something to an AI about suicidal thoughts, trauma, or shame, you need to know — really know — that those words don't go anywhere.

But every AI companion app I could find sends your words to a cloud server. Your most vulnerable moments, stored on someone else's machine, processed by someone else's model, governed by someone else's privacy policy. That felt wrong.

So I built **NilaMind** — an open-source Android app that runs a 1.5B-parameter language model entirely on your phone. No cloud. No account. No analytics. Not even your voice leaves the device.

Here's how every piece of the architecture works, and why the safety design matters more than the model.

---

## The Stack at a Glance

| Layer | Technology |
|-------|-----------|
| UI | React 19, Tailwind 4, Vite 6 |
| Mobile Shell | Capacitor 8 (Android) |
| LLM Runtime | llama.cpp (C++, JNI bridge) |
| Default Model | Qwen2.5-1.5B-Instruct Q4_K_M GGUF |
| Voice Input | Vosk WASM (on-device STT) |
| Crisis Classifier | MiniLM via ONNX Runtime Web |
| Storage | Dexie (IndexedDB) + AES-256-GCM |
| Identity | BIP39 (no-account recovery phrase) |

---

## Running llama.cpp on Android

The inference engine is [llama.cpp](https://github.com/ggml-org/llama.cpp), compiled natively for ARM64 via CMake and loaded through a Capacitor plugin bridge.

The `llama-cpp-capacitor` plugin packages the full llama.cpp C++ source (~108 files, from `ggml.c` to `chat.cpp`) and compiles it via Gradle's `externalNativeBuild`:

```gradle
externalNativeBuild {
    cmake {
        path "src/main/CMakeLists.txt"
        version "3.22.1"
        ndkVersion "29.0.13113456"
    }
}
```

The CMakeLists compiles `libllama-cpp-arm64.so` with ARMv8-A optimizations:

```cmake
target_compile_options(llama-cpp-arm64 PRIVATE
    -march=armv8-a
    -mtune=cortex-a76
    -O3 -DNDEBUG -fno-finite-math-only -funroll-loops
)
```

The resulting shared library (~6 MB, stripped) is loaded via JNI, with a TypeScript bridge exposing a chat-first API to the React layer.

### Model Selection

The default model is **Qwen2.5-1.5B-Instruct**, quantized to Q4_K_M (~1.1 GB). I chose it over the earlier Gemma-3-1B default because it has an Apache-2.0 license (fully F-Droid-compatible), better instruction-following at this size, and no gated access.

The model is downloaded once on first run with SHA-256 integrity verification. After that, the app works fully offline. It stays resident in memory via an Android foreground service so every reply after the first one is fast.

---

## The Safety Architecture (This Is the Part That Actually Matters)

The most important design decision: **the crisis safety layer is deterministic and model-independent.** The AI is never asked to judge whether someone is in crisis.

### Why This Matters

Mental health AI has a documented failure mode: large models can be **sycophantic** — they validate whatever the user says, including dangerous delusions. A manic person declaring "I'm going to invest my life savings in crypto tonight" might get an encouraging "That sounds exciting!" from an unguarded model.

A 1.5B model is ~15% worse at suicide-risk assessment than specialized tools. Expecting it to handle crisis detection is irresponsible.

### The Two-Layer Safety Gate

**Layer 1 — Keyword Scanner (deterministic floor):**
A regex + substring scanner checks every user input and every model output. It covers crisis statements across English, Hindi, Tamil, and Telugu, including negation-first patterns, euphemistic disclosures, and manic risk markers (grandiosity, impulsive spending, medication stopping).

**Layer 2 — MiniLM Classifier (additive, soft):**
A small ONNX model (~90 MB) scores each input on crisis risk. It catches what keywords miss — subtle emotional disclosures, indirect statements. It's additive: if the keyword scanner fires, the classifier output doesn't matter. If only the classifier fires with high confidence, it elevates gently.

### The Anti-Sycophancy Rule

Rule 6 of the output gate explicitly blocks the model from validating **manic grandiosity, impulsivity, or paranoia**. If the user says "I'm going to invest my life savings in crypto tonight, I have a special gift for predicting markets," the reply is gate-replaced regardless of what the model generated.

### Failing Closed

Every model reply passes through the output gate. If any rule fires, the reply is replaced with a safe fallback that redirects to crisis resources. The model never knows any of this happened — the gate is entirely external.

---

## On-Device Voice: STT That Never Leaves the Phone

Voice input uses **Vosk** compiled to WASM. The small English model (Apache 2.0, ~40 MB) runs entirely on-device. Your spoken words are transcribed locally and never sent to a speech recognition API.

The trade-off: Vosk is less accurate than Google's cloud STT, especially in noisy environments. An optional setting lets users switch to the system recognizer, but the default is on-device.

---

## Encrypted Storage: AES-256-GCM

All user data — conversations, mood logs, check-ins, sleep data, safety plans — is stored in IndexedDB and encrypted at rest. The encryption key is either non-extractable (Android Keystore) or PIN-derived (zero-knowledge mode).

---

## Why Not Just Use GPT-4?

**Privacy is the product.** If my words go to a server, I've already lost. It doesn't matter what the privacy policy says — can I verify it? With a cloud API, you can't. With an on-device model, the network traffic observable on your phone is the proof.

The 1.5B model is small, but the app is designed around its limits:
- **The model listens and reflects** — short, warm, human responses
- **The app handles the "what to do"** — CBT worksheets, DBT skills, grounding exercises — deterministically, not generated
- **Safety is never the model's job** — the deterministic gate owns that

---

## Test Suite

~2,550 tests across 230+ test files. Every safety feature has paired benign-control tests — a false crisis fire on a calm chat is itself harmful. Coverage includes adversarial keyword tests in 4 languages, anti-sycophancy validation, encrypted storage round-trips, and passthrough hydration.

---

## What I'd Do Differently

1. **Model quality at 1.5B is the bottleneck.** The model can be repetitive and formulaic. The next generation of 1.5B-3B models trained for emotional conversation will be a game-changer.

2. **CMake-based Android builds are finicky.** Every NDK update breaks something in the 108-file llama.cpp source tree.

3. **Vosk accuracy varies across accents and background noise.** This is the price of 100% on-device voice.

4. **Testing crisis safety is inherently limited.** You can test exhaustively in code, but you can't ethically run a clinical trial as a solo developer. The safety layer is designed to fail-closed.

---

## Get It

NilaMind is free and open source (Apache 2.0).

- **GitHub:** [github.com/sampathmannam/nilamind](https://github.com/sampathmannam/nilamind)
- **APK:** [GitHub Releases](https://github.com/sampathmannam/nilamind/releases)
- **Auto-updates:** Install via [Obtainium](https://obtainium.imranr.dev)

**Important:** NilaMind is not a medical device, not therapy, and not a crisis service. It's an experimental self-help tool. If you are in crisis, contact emergency services or a crisis line.

---

*I built this after my own experience with bipolar disorder. It's shared openly so others can learn from it and build on it. If you're struggling, you're not alone.*
