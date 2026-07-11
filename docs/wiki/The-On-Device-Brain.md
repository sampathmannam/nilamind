# The On-Device Brain

*Nila* is the persona; the **brain** behind her is a local [GGUF](https://huggingface.co/docs/hub/gguf) language model run by [llama.cpp](https://github.com/ggerganov/llama.cpp) on the phone. Nothing is sent to a server to produce a reply.

## The model

By default the app downloads the **stock Gemma-3-1B-it** — Google's un-fine-tuned instruct model, `Q4_K_M` GGUF, ~806 MB, from [`unsloth/gemma-3-1b-it-GGUF`](https://huggingface.co/unsloth/gemma-3-1b-it-GGUF) — a 2026-07-07 speed A/B. The project's own therapy-tuned **Gemma-3-4B** (~2.5 GB) is a separate ⚠️ **research preview** at [`sampathmannam/nilamind-gemma-3-4b-GGUF`](https://huggingface.co/sampathmannam/nilamind-gemma-3-4b-GGUF), **not** the default brain; it was distilled to be brief, warm, and grounded in CBT/DBT/ACT/MI/self-compassion, with severity-aware stances (hold space vs. reflect vs. gently probe).

NilaMind is **not** married to this model — see [Model Provisioning](Model-Provisioning.md) → *Bring your own model*. Reply quality, latency, and failure modes depend entirely on the model you load.

## Runtime

- Loaded by `src/services/llamaCppLlmAdapter.ts` through `llama-cpp-capacitor`.
- Runs on **CPU** (`n_gpu_layers = 0`); context window `n_ctx = 4096`.
- **Decode parameters:** `temperature 0.4`, `top_k 40`, `top_p 0.95`, `n_predict 220` (a reply-length cap, since decode is the per-token cost on CPU).

### Two hard-won runtime facts
- **No per-token streaming on Android.** The binding returns the whole reply in one call rather than emitting tokens. The adapter calls the `onToken` callback **once** with the full reply so downstream consumers (the speech queue, the live safety guard, the bubble renderer) still work.
- **Generation blocks the plugin thread.** llama.cpp runs synchronously on Capacitor's single shared plugin thread, so the app never runs a generation in the background (doing so would freeze every other native plugin). The cost is paid in the foreground, with a "thinking" state shown.

## Prompt structure

Gemma-3 has **no system role** and its chat template must start with a user turn. So `src/services/gemmaPrompt.ts` builds a raw prompt string (not a `messages[]` array — the binding's templated path is broken on this build) shaped like:

```
<start_of_turn>user
{full system instruction}

Hi<end_of_turn>
<start_of_turn>model
{Nila's seeded greeting}<end_of_turn>
<start_of_turn>user
{your message}<end_of_turn>
<start_of_turn>model
```

The **seeded greeting** as the first model turn is deliberate: it primes the model to stay in Nila's voice. The full system instruction comes from `buildNilaSystem(query)` and is `persona + on-device memory context + relevant skills`. Long conversations are windowed so the prompt never overflows `n_ctx`.

## Performance

- **First message is slow; later messages are fast.** The ~2,300-token system prompt must be "prefilled" once. On a flagship this is tens of seconds cold; llama.cpp's KV **prefix-reuse** then makes follow-up turns in the same session much quicker because the system prefix is reused. The app keeps the system prefix byte-stable to maximize that reuse.
- **Decode throughput** on a recent flagship is on the order of ~16 tokens/sec (cool), so a ~50-word reply lands in a few seconds once prefill is warm. Older/cooler-throttled devices are slower. The project has shipped both a larger "rich but slow" model and a smaller, faster one; the current default is the smaller, faster stock 1B (a 2026-07-07 speed A/B).
- A generous first-token timeout falls back to the calm offline companion rather than hanging.

## Limitations

- **It's a small model (~1B by default).** It can be wrong, repeat itself, or miss nuance. Its most noticeable practical limitation is **formulaic / repetitive phrasing** (a sameness across replies).
- *(On "role-confusion": an earlier single-turn evaluation suggested the model sometimes replied in the user's voice. Re-testing in the app's actual prompt shape — where Nila's greeting is seeded as the first turn — shows replies stay in character. See the model card for the model's documented limitations.)*
- **The model is not a safety system.** It will miss crises. That's exactly why the [§9 layer](Crisis-Safety.md) runs independently around it.
