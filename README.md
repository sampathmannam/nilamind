# NilaMind

**A privacy-first, fully on-device mental-health companion.**

NilaMind is a mobile app built around *Nila* — a companion you can talk to
(by voice or text) for everyday emotional support. Everything runs **on your
phone**: the language model, the crisis-safety checks, speech-to-text and
text-to-speech. There is **no account, no backend, and no analytics** — your
conversations, check-ins, mood, and notes never leave the device.

> ⚠️ **Please read [`SAFETY.md`](SAFETY.md) first.** NilaMind is an experimental
> self-help tool — **not a medical device, not therapy, and not a crisis
> service.** If you may be in danger, contact local emergency services. If you
> fork it, **keep the crisis-safety layer intact.**

---

📖 **Full documentation** — architecture, the on-device brain, the §9 safety design, privacy, features, building, and distribution — is in **[`docs/wiki/`](docs/wiki/)**.

## Install

**Use it:** download the latest signed APK from [**Releases**](https://github.com/sampathmannam/nilamind/releases), or visit the [**landing page**](https://sampathmannam.github.io/nilamind/). On first run the app downloads its on-device model (~2.5 GB, over Wi-Fi, integrity-verified) and then works fully offline. Requires **Android 7.0+ (arm64)**. Coming soon to **IzzyOnDroid** (F-Droid client). Step-by-step: [`docs/wiki/Getting-Started.md`](docs/wiki/Getting-Started.md).

**Build it:** see *Build & run* below.

## Why it exists

It was built as a personal research project for someone living with bipolar
disorder — to support people who are struggling and may not feel able to open
up to anyone. It is shared openly so others can learn from it and build on it.
The one rule it holds above all: **help is the only metric — never gather data
at any cost.**

The design is grounded in research, not vibes. The reasoning, with citations,
is in [`docs/NILA_AGENT_DESIGN.md`](docs/NILA_AGENT_DESIGN.md) and
[`docs/UX_RESEARCH.md`](docs/UX_RESEARCH.md).

## What's inside

- **On-device LLM** via [`llama-cpp-capacitor`](https://www.npmjs.com/package/llama-cpp-capacitor)
  (runs a GGUF model locally — see *Bring your own model* below).
- **Voice-first chat** — talk to Nila and hear her reply; typing always
  available. On-device STT/TTS (`@capacitor-community/speech-recognition`,
  `text-to-speech`) plus a Vosk wake-word path.
- **A model-independent crisis-safety layer ("§9")** — a deterministic keyword
  scanner plus a small on-device MiniLM classifier (ONNX Runtime Web) that
  surfaces support and routes toward a human. Additive, soft, fail-closed.
  See [`SAFETY.md`](SAFETY.md).
- **Local-only memory & tools** — durable profile/insights, daily reflection,
  mood tracking, a "letter to my unwell self" pact, and a dependency guard that
  nudges you toward real people. All stored encrypted on-device (`secureLocal`).
- **No data collection by design.**

**Stack:** React 19 · Vite 6 · Tailwind 4 · Capacitor 8 (Android) ·
Dexie (IndexedDB) · ONNX Runtime Web · Vosk · recharts.

## Bring your own model

**The language model is not bundled in this repository** (GGUF files are large
and licensed separately, and crisis-capable apps shouldn't ship a brain by
default). The installed app **downloads its model on first run** (integrity-verified,
over Wi-Fi); developers can side-load any GGUF instead:

- On the device, replies are produced by `src/services/llamaCppLlmAdapter.ts`
  from a **GGUF** — downloaded in-app on first run, or side-loaded by a developer
  (e.g. a Gemma-3-4B-Instruct GGUF). It is not committed to the app.
- `src/services/localLlm.ts` is a small seam so you can wire other on-device
  backends. For **desktop development** you can point it at a local
  [Ollama](https://ollama.com) model instead of a phone.

**Reference model (⚠️ research preview):** the project's own therapy-tuned Gemma-3-4B — the exact GGUF
this app loads — is published at
[`sampathmannam/nilamind-gemma-3-4b-GGUF`](https://huggingface.co/sampathmannam/nilamind-gemma-3-4b-GGUF).
Its main practical limitation is **repetitive/formulaic phrasing**, and it has **no built-in
crisis-safety layer** — read its model card, keep the app's §9 layer in front of it, and don't treat
it as a usable therapist. (An earlier "role-confusion" concern turned out to be a single-turn
eval-harness artifact — in the app's real prompt shape the model stays in Nila's voice.)

Reply quality, latency, and failure modes depend entirely on the model you
choose. Re-test the safety layer against your model before any real use.

## Build & run

**Prerequisites:** Node.js 18+. For the Android app: Android Studio + a JDK.

```bash
npm install
```

**Web preview** (UI + logic; on-device LLM features are limited in the browser):

```bash
npm run dev
```

**Android device/emulator:**

```bash
npm run build
npx cap sync android
npx cap open android   # then Run on a device from Android Studio
```

Then side-load your GGUF onto the device so the on-device model can load.

**Useful scripts:** `npm run lint` (type-check) · `npm test` (Vitest).
`VITE_STORE_BUILD=1` toggles the Play-Store build profile (optional).

## Privacy

Personal content is stored **only on the device**, encrypted at rest. There is
no server, no account, and no telemetry. If you modify NilaMind, **please don't
add data collection** — that's the line the project won't cross.

## Status

Experimental and personal. Not clinically validated, not a product, no support
guarantees. Shared in the hope it's useful — use at your own risk.

## License

[Apache License 2.0](LICENSE) — provided **"AS IS", without warranty of any
kind.** See [`NOTICE`](NOTICE) and [`SAFETY.md`](SAFETY.md). If you redistribute
or fork NilaMind, keep the crisis-safety layer intact.
