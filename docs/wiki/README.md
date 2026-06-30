# NilaMind

**A privacy-first, fully on-device mental-health companion.**

NilaMind is an Android app built around *Nila* — a companion you can talk to, by voice or text, for everyday emotional support. Everything runs **on your phone**: the language model that generates Nila's replies, the crisis-safety checks, speech-to-text, and text-to-speech. There is **no account, no backend, and no analytics**. Your conversations, check-ins, mood, and notes never leave the device.

> ⚠️ **Read [Crisis Safety (§9)](Crisis-Safety.md) and the disclaimers below before using or forking.**
> NilaMind is an **experimental self-help tool — not a medical device, not therapy, and not a crisis service.** If you may be in danger, contact local emergency services. If you fork it, **keep the crisis-safety layer intact.**

---

## Why it exists

NilaMind was built as a personal research project by someone living with bipolar disorder — to support people who are struggling and may not feel able to open up to anyone. It is shared openly so others can learn from it and build on it.

The one rule it holds above all: **help is the only metric — never gather data at any cost.** That single constraint shapes every architectural decision: the model runs locally, storage is encrypted on-device, and the only thing that can ever leave the phone is a single training example the user explicitly chooses to donate (see [Privacy & Data](Privacy-and-Data.md)).

## What makes it different

- **Genuinely on-device.** Replies come from a local GGUF language model via [`llama-cpp-capacitor`](https://www.npmjs.com/package/llama-cpp-capacitor). No request ever goes to a server to generate text.
- **Safety that doesn't depend on the model.** A deterministic keyword scanner plus a small on-device semantic classifier ("§9") run *around* the model — additive, soft, and fail-closed — and surface real help when they detect danger. See [Crisis Safety (§9)](Crisis-Safety.md).
- **Voice-first.** Talk to Nila and hear her reply; typing is always one tap away. There's a "Hey Nila" wake-word path and a hands-free call mode.
- **Evidence-based, not generic.** The skills and Nila's style draw on CBT, DBT, ACT, and self-compassion (CFT). The design reasoning, with citations, lives in the repo's `docs/`.
- **Zero proprietary dependencies.** The app is Apache-2.0 and builds without any closed-source library.

## How it works, in one breath

You talk to Nila → your message passes a crisis-safety **input** gate → Nila's persona, your on-device memory, and the relevant skills are assembled into a prompt → the local model generates a reply → the reply passes a crisis-safety **output** gate → it's shown and (optionally) spoken. Nothing in that loop touches the network. See [Architecture](Architecture.md) for the full picture.

## Start here

| If you want to… | Go to |
|---|---|
| Install and use the app | [Getting Started](Getting-Started.md) |
| Understand how it's built | [Architecture](Architecture.md) |
| Learn how Nila's "brain" works | [The On-Device Brain](The-On-Device-Brain.md) |
| Understand the safety design | [Crisis Safety (§9)](Crisis-Safety.md) |
| Know exactly what's stored and where | [Privacy & Data](Privacy-and-Data.md) |
| Tour every feature | [Features](Features.md) |
| Build it yourself | [Building from Source](Building-from-Source.md) |
| Run your own model | [Model Provisioning](Model-Provisioning.md) |
| Publish / install via stores | [Distribution](Distribution.md) |
| Contribute | [Contributing](Contributing.md) · [FAQ](FAQ.md) |

## Status

Experimental and personal. **Not clinically validated, not a product, no support guarantees.** Shared in the hope it's useful — use at your own risk.

## Links

- **Source:** https://github.com/sampathmannam/nilamind (Apache-2.0)
- **Latest release:** https://github.com/sampathmannam/nilamind/releases
- **Reference model (⚠️ research preview):** https://huggingface.co/sampathmannam/nilamind-gemma-3-4b-GGUF
