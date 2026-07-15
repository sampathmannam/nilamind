# Running a 1.5B-Parameter LLM Entirely On-Device for Mental Health — The NilaMind Architecture

> *How I built a mental health companion that never connects to the internet, and why the most important safety decisions have nothing to do with the AI.*

---

## The Problem

Mental health conversations are the most private conversations you can have. If you're telling something to an AI about suicidal thoughts, trauma, or shame, you need to know — *really know* — that those words don't go anywhere. 

But every AI companion app I could find sends your words to a cloud server. Your most vulnerable moments, stored on someone else's machine, processed by someone else's model, governed by someone else's privacy policy. That felt wrong.

So I built NilaMind — an open-source Android app that runs a 1.5B-parameter language model entirely on your phone. No cloud. No account. No analytics. Not even your voice leaves the device.

Here's how every piece of the architecture works, and why the safety design matters more than the model.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  Android Device               │
│                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  React   │  │  Vosk    │  │  ONNX       │ │
│  │  (UI)    │  │  (STT)   │  │  (MiniLM)   │ │
│  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │             │               │         │
│  ┌────┴─────────────┴───────────────┴──────┐ │
│  │           Safety Layer (§9)              │ │
│  │   Keyword Scanner + MiniLM Classifier    │ │
│  │          (model-independent)             │ │
│  └────────────────────┬────────────────────┘ │
│                       │                       │
│  ┌────────────────────┴────────────────────┐ │
│  │          llama.cpp (JNI bridge)          │ │
│  │        Qwen2.5-1.5B Q4_K_M GGUF         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │     AES-256-GCM Encrypted Storage        │ │
│  │     (IndexedDB — all data local only)    │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

Nothing crosses the device boundary except the one-time model download.

---

## Running llama.cpp on Android

The inference engine is [llama.cpp](https://github.com/ggml-org/llama.cpp), compiled natively for ARM64 via CMake and loaded through a Capacitor plugin bridge.

### The Native Bridge

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

The CMakeLists.txt points at the bundled `cpp/` directory and builds `libllama-cpp-arm64.so` with ARMv8-A optimizations tuned for Cortex-A76:

```cmake
target_compile_options(llama-cpp-arm64 PRIVATE
    -march=armv8-a
    -mtune=cortex-a76
    -O3 -DNDEBUG -fno-finite-math-only -funroll-loops
)
```

The resulting `~6 MB` shared library (stripped) is loaded via JNI, and a TypeScript bridge exposes a chat-first API to the React layer.

### Model Selection

The default model is **Qwen2.5-1.5B-Instruct**, quantized to Q4_K_M GGUF format (~1.1 GB). I chose Qwen over the earlier Gemma-3-1B default because:
- **Apache-2.0 license** (fully compatible with the app, no terms-of-use surprises for F-Droid)
- **Better instruction-following** at this parameter size
- **No gated access** — public HuggingFace repo, freely distributable

The model is downloaded once on first run with SHA-256 integrity verification. After that, the app works fully offline. The model stays resident in memory via an Android foreground service so every reply after the first one is fast.

---

## The Safety Architecture (The Part That Actually Matters)

Here's the most important design decision in the whole app: **the crisis safety layer is deterministic and model-independent.** The AI is never asked to judge whether someone is in crisis.

### Why?

Mental health AI has a documented failure mode: large models can be **sycophantic** — they validate whatever the user says, including dangerous delusions. A manic person declaring "I'm going to invest my life savings in crypto tonight" might get an encouraging "That sounds exciting!" from an unguarded model. A depressed person saying "I don't want to be here anymore" might get a calm, reflective response that fails to surface help.

A 1.5B model is **~15% worse at suicide-risk assessment** than specialized clinical tools. Expecting it to handle crisis detection is irresponsible.

### The Two-Layer Safety Gate

**Layer 1 — Keyword Scanner (deterministic floor):**
A regex + substring scanner checks every user input and every model output for crisis ideation, self-harm, violence, and manic risk markers. It covers:
- Direct crisis statements across English, Hindi (Devanagari), Tamil, and Telugu
- Negation-first patterns ("mujhe nahi jeena" = "I don't want to live")
- Euphemistic disclosures ("I just want the pain to stop")
- Manic risk markers (grandiosity, impulsive spending, medication stopping, hypersexuality)
- **Anti-sycophancy Rule 6** — blocks the model from validating manic delusions, grandiosity, or impulsivity

**Layer 2 — MiniLM Classifier (additive, soft):**
A small ONNX model (MiniLM, ~90 MB) scores each input on crisis risk. It catches what keywords miss — subtle emotional disclosures, indirect statements, culturally-specific phrasing. It's additive, not a replacement. If the keyword scanner fires, the classifier output doesn't matter — crisis takes over. If only the classifier fires with high confidence, it elevates gently.

### Failing Closed

Every single reply the model generates is run through the **output gate** (Rules 1–6):
1. No crisis method disclosure
2. No encouragement of self-harm
3. No validation of suicidal ideation  
4. No normalization of abuse
5. No discouragement from seeking professional help
6. No validation of manic grandiosity, impulsivity, or paranoia

If any rule fires, the reply is replaced with a safe fallback that redirects to crisis resources. The model never knows any of this happened — the gate is entirely external.

---

## On-Device Voice: Speech-to-Text That Never Leaves the Phone

Voice input uses **Vosk** (via `vosk-browser`) compiled to WASM. The small English model (`vosk-model-small-en-us-0.15`, ~40 MB, Apache 2.0) runs entirely on-device. Your spoken words are transcribed locally and never sent to a speech recognition API.

The trade-off: Vosk is less accurate than Google's cloud STT. But the privacy guarantee is absolute — your voice never leaves the phone. An optional setting lets users switch to the system's speech recognizer if they prefer accuracy over privacy, but the default is on-device.

---

## Encrypted Storage: AES-256-GCM

All user data — conversations, mood logs, check-ins, sleep data, safety plans — is stored in IndexedDB and encrypted at rest with AES-256-GCM. The encryption key is either:
- **Non-extractable** (stored in Android Keystore, the default)
- **PIN-derived** (optional zero-knowledge mode where not even the app knows the key)

A `secureLocal` abstraction layer provides an in-memory cache on top of encrypted IndexedDB, with passthrough hydration before declaring failure. 32 sensitive keys (from `nilamind_chat_history` to `nilamind_caregiver_contacts`) are individually encrypted.

---

## Why Not Just Use GPT-4?

This is the question I get most often. The answer is simple: **privacy is the product.**

If my words go to a server, I've already lost. It doesn't matter if the privacy policy says "we don't train on your data." What matters is: can I verify that? With a cloud API, you can't. With an on-device model, you can — the network traffic observable on your phone is the proof.

The 1.5B model is small, yes. But the app is designed around its limits:
- **The model listens and reflects** — short, warm, human responses
- **The app handles the "what to do"** — CBT worksheets, DBT skills, grounding exercises, breathing — deterministically, not generated by the LLM
- **Safety is never the model's job** — the deterministic gate owns that

This is the opposite of "throw GPT-4 at the problem." It's a deliberate architecture where each component does what it does reliably.

---

## The Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19, Tailwind 4, Vite 6 |
| Mobile Shell | Capacitor 8 (Android) |
| LLM Runtime | llama.cpp (C++, JNI bridge) |
| Model | Qwen2.5-1.5B-Instruct Q4_K_M GGUF |
| Voice Input | Vosk WASM (on-device STT) |
| Crisis Classifier | MiniLM via ONNX Runtime Web |
| Storage | Dexie (IndexedDB) + AES-256-GCM |
| Charts | Recharts |
| PDF Export | jsPDF (clinician reports) |
| Identity | BIP39 (no-account recovery phrase) |

---

## Test Suite

~2,550 tests across 230+ test files. Every safety feature has paired benign-control tests — a false crisis fire on a calm chat is itself harmful. The test suite includes:
- §9 keyword scanner adversarial tests (all 4 languages)
- MiniLM classifier threshold validation
- Output gate Rules 1–6 compliance
- Anti-sycophancy manic validation blocking
- Elevation guard racing-thoughts detection
- Encrypted storage round-trip integrity
- Passthrough hydration and failure recovery

---

## What I'd Do Differently

1. **Model quality at 1.5B is still the bottleneck.** The model can be repetitive and formulaic. A 7B quantized model would be noticeably better but pushes against phone memory limits. The next generation of small models (1.5B-3B specifically trained for emotional conversation) will be a game-changer.

2. **CMake-based Android builds are finicky.** Getting `externalNativeBuild` to work reliably across NDK versions, especially with the 108-file llama.cpp source tree, was the hardest engineering problem in this project. Every NDK update breaks something.

3. **Vosk accuracy varies wildly across accents and background noise.** The on-device STT is sufficient for quiet environments but degrades significantly in noisy ones. This is the price of 100% on-device voice.

4. **Testing crisis safety is inherently limited.** You can test the keyword scanner and classifier exhaustively, but you can't ethically test whether the system actually helps someone in crisis. The safety layer is designed to fail-closed, which is the best you can do short of a clinical trial.

---

## Get It

NilaMind is free and open source (Apache 2.0).

- **GitHub:** [https://github.com/sampathmannam/nilamind](https://github.com/sampathmannam/nilamind)
- **Download APK:** [GitHub Releases](https://github.com/sampathmannam/nilamind/releases)
- **Auto-updates:** Install via [Obtainium](https://obtainium.imranr.dev) (F-Droid ecosystem, same signing key)

**Important:** NilaMind is not a medical device, not therapy, and not a crisis service. It's an experimental self-help tool. If you are in crisis, contact emergency services or a crisis line. The app will tell you the same thing.

---

*I built this after my own experience with bipolar disorder. It's shared openly so others can learn from it and build on it. If you're struggling, you're not alone.*
