# LLM Strengthening — Research Basis (2026-07-15)

Goal: get the most out of a small (1–3B), CPU-only, on-device model for the companion chat — no
frontier model, no cloud in the default path. Every change below names the research it is derived
from; anything we deliberately did NOT do is listed with its reason. Runtime constraints that shaped
every decision: llama-cpp-capacitor 0.1.5 (bundled llama.cpp supports up to the **Qwen3** arch — no
Qwen3.5; no speculative-decoding params), one shared Capacitor plugin thread, 8 GB-class phones.

## What shipped

### 1. Per-model-family sampling profiles (`llamaCppLlmAdapter.ts`)

One global sampling config was wrong the moment the catalog grew past one model family. Each family
now gets its vendor/community-recommended decode settings:

| format | temp | top_k | top_p | min_p | presence | why |
|---|---|---|---|---|---|---|
| qwen (2.5) | 0.6 | 40 | 0.95 | **0.05** | — | prior device-tuned values + min-p floor |
| qwen3 | **0.7** | **20** | **0.8** | 0 | **1.0** | official Qwen3 model-card non-thinking settings |
| gemma | 0.6 | 40 | 0.95 | **0.05** | — | prior values + min-p floor |

- **min-p**: Nguyen et al., *Turning Up the Heat: Min-p Sampling for Creative and Coherent LLM
  Outputs* ([arXiv:2407.01082](https://arxiv.org/abs/2407.01082), **ICLR 2025 oral**) — a
  confidence-scaled truncation floor (keep tokens ≥ min_p × p_top). Adopted by llama.cpp/HF/vLLM as
  a default-on sampler; particularly helps small models stay coherent where fixed top-p admits
  low-probability junk. We use the paper's default 0.05 as a *belt* alongside existing samplers
  rather than replacing them — a critical re-analysis ([arXiv:2506.13681](https://arxiv.org/abs/2506.13681))
  found the headline gains overstated, so we take the cheap floor, not the aggressive config.
- **Qwen3 non-thinking profile**: the official
  [Qwen3-1.7B model card](https://huggingface.co/Qwen/Qwen3-1.7B) prescribes temp 0.7 / top_p 0.8 /
  top_k 20 / min_p 0 for non-thinking mode, warns against greedy decoding (endless repetition), and
  recommends presence_penalty 0–2 against repetition — which we have device-observed on quantized
  small models (2026-07-11 repetition-loop fix). We set presence 1.0 alongside the existing DRY
  sampler (kept — device-proven).

### 2. Qwen3 prompt format, non-thinking (`qwenPrompt.ts` → `toQwen3Prompt`)

Qwen3 is a hybrid thinking model. Companion chat always runs **non-thinking**: the official hard
switch renders the assistant cue prefilled with an empty `<think>\n\n</think>\n\n` block (Qwen3 model
card, "Switching Between Thinking and Non-Thinking Mode"); we mirror that rendering in the raw-prompt
path. Defence-in-depth: `stripThinkBlocks()` removes any leaked think block from output and
**fail-closed drops an unclosed block entirely** — leaked hidden reasoning (raw deliberation about
the user's state) must never render as Nila's reply. Thinking mode is deliberately not offered: on a
CPU decoder at ~10 tok/s, hidden reasoning would multiply reply latency for no companion-visible win.

### 3. Qwen3-1.7B catalog entry at Q8_0 (`modelCatalog.ts`, id `fast3`)

- **Model choice**: within what the binding can load (arch ceiling = Qwen3), Qwen3-1.7B is the
  strongest small brain: a generation ahead of Qwen2.5-1.5B (Qwen3 released Apr 2025; Apache-2.0;
  32K context). Qwen3.5 (Mar 2026) would be better still —
  [Qwen3.5-2B scores 16 vs Qwen3-1.7B's 13 on the Artificial Analysis Intelligence Index](https://artificialanalysis.ai/articles/qwen3-5-small-models)
  — but no shipped llama-cpp-capacitor (≤0.2.2, checked 2026-07-15) has the arch; revisit on the
  binding's next bump.
- **Q8_0, not Q4_K_M, is deliberate**: quantization noise hurts sub-3B models disproportionately —
  they lack the redundancy to absorb it (layer-wise PTQ study,
  [arXiv:2508.03332](https://arxiv.org/html/2508.03332v1); practitioner guidance from SLM quantization
  studies: Q4_K_M holds full quality at ≥3B, prefer Q8_0 below that, e.g.
  [EA Forum SLM quantization study](https://forum.effectivealtruism.org/posts/H4ecMXSzQuGJxw4wE/impact-of-quantization-on-small-language-models-slms-for-1);
  weight-distribution drift begins at Q4_K while Q8/Q6/Q5 stay stable,
  [arXiv:2607.08734](https://arxiv.org/html/2607.08734)). The 3B "quality" entry stays Q4_K_M per the
  same guidance.
- Size/sha are the exact public HF API LFS values; **not the default** until device-verified
  (native-load gate — the MiniCPM lesson).

### 4. Grammar-constrained reflection output (`nilaInsights.ts` + `LocalGenParams.jsonSchema`)

The nightly reflection asked a 1–2B model for free-form JSON; any prose/fence/trailing-comma output
failed `JSON.parse` and silently **lost that day's reflection**. The reflection call now passes a
JSON Schema; the llama.cpp binding compiles it to a GBNF grammar so the decoder *cannot* emit invalid
JSON.

- Why this is safe here and NOT used for chat: format constraints measurably degrade open-ended and
  reasoning-heavy generation, but are benign-to-positive for **classification/extraction** — exactly
  the reflection task (Tam et al., *Let Me Speak Freely? A Study on the Impact of Format Restrictions
  on Performance of Large Language Models*, EMNLP Industry 2024,
  [arXiv:2408.02442](https://arxiv.org/abs/2408.02442); benchmark context:
  *JSONSchemaBench*, [arXiv:2501.10868](https://arxiv.org/abs/2501.10868)).
- The parse fallback stays: cloud/reflect/ollama backends may ignore `jsonSchema`.

### 5. First-run integrity fixes (`modelCatalog.ts`, guarded by `modelCatalog.test.ts`)

Found while wiring the above, release-blocking: the 3B "quality" entry carried a *rounded placeholder*
size (1,985,000,000 vs the real 2,104,932,768) — the exact-match integrity check would have rejected
every completed 2.1 GB download at 100% — and a catalog reorder had silently made that entry the
first-run download. Fixed the size, added the real sha256, restored the device-verified 1.5B as
`MODELS[0]`, and pinned all of it with tests.

## Considered and rejected (with reasons)

- **Best-of-N / test-time compute for chat**: works when a verifier exists (HF's test-time-scaling
  study brought Llama-3.2-1B near 8B on MATH-500; Snell et al.,
  [ICLR 2025](https://proceedings.iclr.cc/paper_files/paper/2025/file/1b623663fd9b874366f3ce019fdfdd44-Paper-Conference.pdf);
  *Can 1B surpass 405B?* [arXiv:2502.06703](https://arxiv.org/abs/2502.06703)). Rejected for the
  live chat path: decode is ~10 tok/s on one serialized plugin thread, so N=2 doubles a
  13-second reply; worse, tokens stream live to the UI and the voice call *speaks* them — a
  discarded candidate would be visibly/audibly un-said. The existing heuristic scorer
  (`responseQuality.ts`) stays available for non-streamed surfaces.
- **XTC / mirostat / typical-p samplers**: exposed by the binding but no peer-reviewed evidence of
  benefit for short empathetic replies, and XTC deliberately suppresses the most-probable tokens —
  the wrong direction for a safety-critical companion.
- **Speculative / draft-model decoding**: binding exposes no draft params (≤0.2.2); revisit on bump.
- **Thinking mode (Qwen3)**: latency-prohibitive on CPU; hidden-reasoning leak risk in a companion.
- **Qwen3.5-2B**: blocked on binding arch support (see above) — the moment it lands, this is the
  planned `fast` successor.

## Verification state

- Unit: full suite green (see guard); new coverage for the Qwen3 prompt/strip, sampling profiles,
  schema passthrough, reflection schema, catalog integrity.
- Device: Qwen3-1.7B side-load gate pending (adb push + load + chat QA on the Motorola) before any
  default flip.
