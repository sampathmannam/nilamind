# Small Language Model Comparison for NilaMind

**Date:** 2026-07-07
**Criteria:** Under 2B params, GGUF, empathetic conversation, Hindi support, on-device Android ARM64, minimal hallucination

---

## ⚠️ Deployment status — read first (2026-07-07)

**This is exploratory research.** **Outcome (2026-07-07 speed A/B):** the lightweight-tier idea this doc
explores was adopted — the shipped default on-device brain is now the **stock Gemma-3-1B-it**
(`gemma-3-1b-it-Q4_K_M.gguf`, ~806 MB), for a much faster load and replies. The previously-shipped
therapy-tuned **Gemma-3-4B** (`v2-4b-Q4_K_M.gguf`, ~2.5 GB) survives only as a one-line catalog revert /
developer side-load. Both run **CPU-only via `llama-cpp-capacitor`** — device-verified on an ~11.5 GB-RAM
Android (Moto, ZD2232FCR5), with §9 crisis safety firing model-independently. A Vulkan GPU inference path was tried and **removed** (it failed to compile shaders on the
Adreno GPU → `VK_ERROR_DEVICE_LOST` → hard crash); CPU is the reliable transport. See
[`nilaContext` / `modelDownload`](../src/services/modelDownload.ts) and the `fix(llm)` commit.

So the **"< 2B params / 4 GB RAM"** framing below is **not** the current constraint — the test device has ~11.5 GB
and comfortably runs the 4B. This doc evaluates a **smaller, faster model for a potential lightweight tier**
(low-end / low-RAM devices, or the "speed fast-path" — cutting the ~2.5 GB load and multi-second cold-start).
Treat the Qwen2.5-1.5B recommendation as a **candidate for that tier, not a replacement for the 4B brain.**
Any switch must clear the same bar the 4B did: **deterministic model-independent §9 crisis safety**, real Hindi
quality, anti-sycophancy, and **on-device verification before it ships** — a smaller model is likely *worse* at
crisis nuance, so the safety layer stays deterministic regardless of which brain runs beneath it.

---

## Executive Summary

**#1 RECOMMENDATION: Qwen2.5-1.5B-Instruct** — Best balance of multilingual (Hindi), instruction following, Apache 2.0 license, and GGUF availability for NilaMind.

**#2 RUNNER-UP: Gemma-3-1B-IT** — Smallest (1B), excellent Hindi via IndicGenBench, strong safety training, but Gemma license limits commercial scale.

**#3 ALTERNATIVE: Llama-3.2-1B-Instruct** — Best 128K context, Hindi official support, but Llama license restrictions at scale.

---

## Detailed Model Comparison

### 1. Gemma-3-1B-IT (Google)

| Attribute | Value |
|---|---|
| **Parameters** | 1.0B |
| **GGUF** | Yes — 448+ quantizations (ggml-org, unsloth, bartowski, official QAT Q4_0) |
| **Context Window** | 32K tokens |
| **License** | Gemma (free under 50M MAU, commercial license required above) |
| **Training Tokens** | 2T |
| **IFEval** | Not directly reported for 1B IT (4B reports not available) |
| **MMLU** | ~24.9 (Global-MMLU-Lite, PT) |
| **Multilingual** | 140+ languages, IndicGenBench: 41.4 |
| **Android Speed** | ~50+ tok/s at Q4_K_M (estimated from 1B size class) |
| **Safety** | Google Responsible AI toolkit, extensive red-teaming |

**Strengths:**
- Smallest model in comparison (1B) = fastest on Android, lowest RAM
- Official GGUF QAT quantization from Google (optimized)
- Excellent multilingual support including Hindi
- Strong safety training from Google's Responsible AI team
- 32K context window (adequate for conversation)
- 448+ community quantizations = mature ecosystem

**Weaknesses:**
- Gemma license limits commercial use above 50M MAU
- MMLU scores are modest at 1B scale
- No official IFEval score reported for 1B variant
- Conversational quality at 1B may be limited for complex empathetic dialogue

**Mental Health Suitability:** GOOD — Safety-trained, grounded responses, but 1B may lack nuance for complex emotional scenarios.

---

### 2. Llama-3.2-1B-Instruct (Meta)

| Attribute | Value |
|---|---|
| **Parameters** | 1.23B |
| **GGUF** | Yes — 400+ quantizations |
| **Context Window** | 128K (8K quantized) |
| **License** | Llama 3.2 Community (700M MAU threshold) |
| **Training Tokens** | 9T |
| **IFEval** | 59.5 |
| **MMLU** | 49.3 |
| **Multilingual** | 8 languages (English, German, French, Italian, Portuguese, Hindi, Spanish, Thai) |
| **Android Speed** | ~50.2 tok/s (SpinQuant), ~45.8 tok/s (QLoRA) — Meta tested on OnePlus 12 |
| **Safety** | Extensive safety fine-tuning, Llama Guard recommended |

**Strengths:**
- Best instruction following at 1B scale (IFEval 59.5)
- 128K context (longest in class, though 8K when quantized)
- Hindi is an officially supported language
- Meta's extensive safety testing and red-teaming
- Excellent GGUF ecosystem (400+ quantizations)
- 9T training tokens (most data of any 1B model)
- Tested on Android ARM64 by Meta (OnePlus 12)

**Weaknesses:**
- Llama license: commercial restrictions at 700M MAU
- Hindi is one of 8 supported languages (not as deeply trained as Qwen)
- 128K context reduced to 8K when quantized for mobile
- Higher RAM usage than Gemma-3-1B

**Mental Health Suitability:** GOOD — Strong instruction following means better protocol adherence, good safety training, but Hindi depth is limited.

---

### 3. Qwen2.5-1.5B-Instruct (Alibaba) ⭐ RECOMMENDED

| Attribute | Value |
|---|---|
| **Parameters** | 1.54B |
| **GGUF** | Yes — 221+ quantizations (Qwen official GGUF, bartowski, multiple Q4_K_M/Q5_K_M) |
| **Context Window** | 32K tokens (8K generation) |
| **License** | Apache 2.0 ✅ |
| **Training Tokens** | 18T (Qwen2.5 series) |
| **IFEval** | ~47.4 (from SmolLM2 comparison) |
| **MMLU** | ~55 (estimated from Qwen2.5 series) |
| **Multilingual** | 29+ languages (Chinese, English, French, Spanish, Portuguese, German, Italian, Russian, Japanese, Korean, Vietnamese, Thai, Arabic, Hindi) |
| **Android Speed** | ~30-40 tok/s at Q4_K_M (estimated) |
| **Safety** | Instruction-tuned, safety-aligned |

**Strengths:**
- **Apache 2.0 license** — no commercial restrictions, best for India-first app
- Strongest multilingual support (29+ languages) — Hindi well-represented
- 32K context window (adequate for conversation)
- Good instruction following at 1.5B scale
- Extensive GGUF quantization ecosystem (221+ options)
- Trained on 18T tokens (massive dataset)
- Better conversational quality than smaller models due to 1.5B params
- Resilient to diverse system prompts (important for persona consistency)

**Weaknesses:**
- Slightly larger than Gemma-3-1B (1.54B vs 1B) = more RAM
- IFEval lower than Llama-3.2 (47.4 vs 59.5)
- Chinese-centric training may affect Hindi nuances
- No official Android inference benchmarks from Qwen

**Mental Health Suitability:** VERY GOOD — Best Hindi support, Apache 2.0 license, good instruction following, conversational quality at 1.5B is noticeably better than 1B for empathetic dialogue.

---

### 4. SmolLM2-1.7B-Instruct (HuggingFace)

| Attribute | Value |
|---|---|
| **Parameters** | 1.7B |
| **GGUF** | Yes — 108+ quantizations |
| **Context Window** | Not specified in card (likely 4K-8K) |
| **License** | Apache 2.0 ✅ |
| **Training Tokens** | 11T |
| **IFEval** | 56.7 |
| **MMLU-Pro** | 19.3 |
| **Multilingual** | English primarily |
| **Android Speed** | ~30-35 tok/s estimated |
| **Safety** | SFT + DPO aligned |

**Strengths:**
- Apache 2.0 license
- Best IFEval at 1.7B (56.7) — strong instruction following
- Good conversational quality (1.7B params)
- Data-centric training approach (quality over quantity)

**Weaknesses:**
- **English primarily** — no Hindi support
- 1.7B = largest in comparison = most RAM
- Fewer GGUF quantizations (108 vs 200+)
- No multilingual benchmarks reported
- Not suitable for India-first app

**Mental Health Suitability:** POOR — English-only makes it unsuitable for NilaMind's India-first requirement.

---

### 5. Granite-3.1-2B-Instruct (IBM)

| Attribute | Value |
|---|---|
| **Parameters** | 2.5B (2B dense) |
| **GGUF** | Yes — 30+ quantizations |
| **Context Window** | 128K tokens |
| **License** | Apache 2.0 ✅ |
| **Training Tokens** | 12T |
| **IFEval** | 62.86 |
| **MMLU-Pro** | 20.21 |
| **Multilingual** | 12 languages (English, German, Spanish, French, Japanese, Portuguese, Arabic, Czech, Italian, Korean, Dutch, Chinese) — **NO HINDI** |
| **Android Speed** | ~25-30 tok/s estimated (2.5B) |
| **Safety** | IBM enterprise safety focus |

**Strengths:**
- Apache 2.0 license
- Best IFEval (62.86) in comparison
- 128K context window
- Enterprise-grade safety focus from IBM

**Weaknesses:**
- **2.5B parameters** — too large for 4GB RAM Android
- **No Hindi support** (12 languages listed don't include Hindi)
- Fewer GGUF quantizations (30+)
- Over-parameterized for NilaMind's needs

**Mental Health Suitability:** N/A — Too large and no Hindi.

---

### 6. Phi-3-mini-4k-Instruct (Microsoft)

| Attribute | Value |
|---|---|
| **Parameters** | 3.8B |
| **GGUF** | Yes — 173+ quantizations |
| **Context Window** | 4K tokens |
| **License** | MIT ✅ |
| **Training Tokens** | 4.9T |
| **IFEval** | Not reported |
| **MMLU** | 70.9 |
| **Multilingual** | English primarily (some French) |
| **Android Speed** | ~15-20 tok/s estimated (3.8B) |
| **Safety** | SFT + DPO aligned |

**Strengths:**
- MIT license
- Excellent MMLU (70.9) — far exceeds 1B models
- Strong reasoning capabilities

**Weaknesses:**
- **3.8B parameters** — too large for 4GB RAM Android
- English only — no Hindi
- 4K context (shortest in comparison)
- Too heavy for on-device deployment

**Mental Health Suitability:** N/A — Too large and English-only.

---

### 7. Gemma-2-2B-it (Google)

| Attribute | Value |
|---|---|
| **Parameters** | 2.6B |
| **GGUF** | Yes — 185+ quantizations |
| **Context Window** | 8K tokens |
| **License** | Gemma |
| **Training Tokens** | 2T |
| **IFEval** | Not reported |
| **MMLU** | 51.3 |
| **Multilingual** | English primarily |
| **Android Speed** | ~20-25 tok/s estimated (2.6B) |
| **Safety** | Google Responsible AI |

**Strengths:**
- Google safety training
- 8K context

**Weaknesses:**
- **2.6B parameters** — too large for 4GB RAM
- English primarily — no Hindi
- Older generation (Gemma 2 vs Gemma 3)

**Mental Health Suitability:** N/A — Too large and English-only.

---

### 8. TinyLlama-1.1B-Chat-v1.0

| Attribute | Value |
|---|---|
| **Parameters** | 1.1B |
| **GGUF** | Yes — 148+ quantizations |
| **Context Window** | 2K tokens |
| **License** | Apache 2.0 ✅ |
| **Training Tokens** | 3T |
| **IFEval** | Not reported |
| **MMLU** | Low (base model) |
| **Multilingual** | English only |
| **Android Speed** | ~50+ tok/s estimated |
| **Safety** | Zephyr-style SFT + DPO |

**Strengths:**
- Apache 2.0 license
- Very small (1.1B) = fast inference
- Many GGUF quantizations

**Weaknesses:**
- **2K context** — severely limits conversation quality
- English only — no Hindi
- Chat model is a thin finetune, not deeply aligned
- Outdated architecture (Llama 2 based)
- Low quality conversational output

**Mental Health Suitability:** POOR — Too limited in context and language.

---

### 9. Phi-2 (Microsoft)

| Attribute | Value |
|---|---|
| **Parameters** | 2.7B |
| **GGUF** | Yes — 59+ quantizations |
| **Context Window** | 2K tokens |
| **License** | MIT ✅ |
| **Training Tokens** | 1.4T |
| **IFEval** | Not reported |
| **MMLU** | ~56 (base) |
| **Multilingual** | English only |
| **Android Speed** | ~20-25 tok/s estimated |
| **Safety** | Not instruction-tuned |

**Strengths:**
- MIT license
- Good reasoning for size

**Weaknesses:**
- **2.7B parameters** — too large
- **2K context** — very limited
- English only — no Hindi
- **Not instruction-tuned** — base model only
- No chat template

**Mental Health Suitability:** N/A — Not instruction-tuned, English-only.

---

### 10. StableLM-2-1.6B (Stability AI)

| Attribute | Value |
|---|---|
| **Parameters** | 1.6B |
| **GGUF** | Yes — 4 quantizations |
| **Context Window** | 4K tokens |
| **License** | Stability Community License ⚠️ (commercial requires Stability membership) |
| **Training Tokens** | 2T |
| **IFEval** | Not reported |
| **MMLU** | Not reported for 1.6B |
| **Multilingual** | 7 languages (English, Spanish, German, French, Italian, Portuguese, Dutch) — **NO HINDI** |
| **Android Speed** | ~35-40 tok/s estimated |
| **Safety** | Base model (not instruction-tuned) |

**Strengths:**
- Moderate size (1.6B)
- 4K context

**Weaknesses:**
- **Restrictive license** — commercial use requires Stability membership
- **No Hindi support** — only European languages
- **Base model** — not instruction-tuned
- Very few GGUF quantizations (4)
- Stability AI's uncertain future/leadership

**Mental Health Suitability:** N/A — Not instruction-tuned, no Hindi, restrictive license.

---

## Head-to-Head Comparison Table

| Model | Params | Context | License | Hindi | IFEval | MMLU | GGUF Count | Android tok/s |
|---|---|---|---|---|---|---|---|---|
| **Qwen2.5-1.5B** | 1.54B | 32K | Apache 2.0 ✅ | ✅ Strong | ~47.4 | ~55 | 221+ | ~35 |
| **Gemma-3-1B** | 1.0B | 32K | Gemma ⚠️ | ✅ Good (41.4) | N/A | ~25 | 448+ | ~50 |
| **Llama-3.2-1B** | 1.23B | 128K/8K | Llama ⚠️ | ✅ Official | 59.5 | 49.3 | 400+ | ~50 |
| SmolLM2-1.7B | 1.7B | ~8K | Apache 2.0 ✅ | ❌ | 56.7 | N/A | 108+ | ~32 |
| Granite-3.1-2B | 2.5B | 128K | Apache 2.0 ✅ | ❌ | 62.86 | N/A | 30+ | ~27 |
| Phi-3-mini-4k | 3.8B | 4K | MIT ✅ | ❌ | N/A | 70.9 | 173+ | ~17 |
| Gemma-2-2B | 2.6B | 8K | Gemma ⚠️ | ❌ | N/A | 51.3 | 185+ | ~22 |
| TinyLlama-1.1B | 1.1B | 2K | Apache 2.0 ✅ | ❌ | N/A | Low | 148+ | ~50 |
| Phi-2 | 2.7B | 2K | MIT ✅ | ❌ | N/A | ~56 | 59+ | ~22 |
| StableLM-2-1.6B | 1.6B | 4K | Stability ⚠️ | ❌ | N/A | N/A | 4 | ~37 |

---

## Analysis for NilaMind Specifically

### What NilaMind Needs
1. **Hindi support** — India-first app, must support Hindi conversations
2. **On-device** — 4GB RAM Android, ARM64, llama.cpp
3. **GGUF format** — Q4_K_M or Q5_K_M quantization
4. **Empathetic conversation** — not just factual Q&A
5. **Minimal hallucination** — safety-critical, grounded responses
6. **Instruction following** — must adhere to safety protocols (§9 crisis safety)
7. **Commercial license** — Apache 2.0 preferred, no MAU restrictions

### Why Qwen2.5-1.5B Wins for NilaMind

1. **Apache 2.0 license** — No commercial restrictions. Llama and Gemma both have MAU thresholds that could become issues. Qwen2.5 is truly open.

2. **Best Hindi support** — 29+ languages including Hindi. Llama supports Hindi but as 1 of 8 languages. Gemma-3 supports Hindi via IndicGenBench but Qwen's 29+ language training gives broader multilingual capability.

3. **32K context window** — Adequate for multi-turn mental health conversations. Llama's 128K is better but gets reduced to 8K when quantized for mobile anyway.

4. **1.54B parameters** — Sweet spot between:
   - Too small (1B = limited conversational quality)
   - Too large (2.5B+ = won't fit in 4GB RAM)
   - The 1.5B scale shows noticeably better conversational quality than 1B models

5. **Instruction following** — While IFEval is lower than Llama (47.4 vs 59.5), Qwen2.5's training on diverse system prompts makes it resilient to persona consistency, which is critical for NilaMind's companion persona.

6. **GGUF ecosystem** — 221+ quantizations including official Qwen GGUF. Multiple Q4_K_M and Q5_K_M options available.

7. **Training quality** — 18T tokens of training data, significantly more than Gemma-3-1B (2T) or Llama-3.2-1B (9T).

### Why Not Gemma-3-1B?

Gemma-3-1B is the smallest and fastest, but:
- **License limitation**: Gemma license requires commercial license above 50M MAU
- **Conversational quality**: 1B params is at the lower end for empathetic dialogue
- **Hindi depth**: IndicGenBench 41.4 is good but Qwen's 29+ language training may produce more natural Hindi

### Why Not Llama-3.2-1B?

Llama-3.2-1B has excellent instruction following (IFEval 59.5), but:
- **License limitation**: Llama 3.2 license requires commercial license above 700M MAU
- **Hindi depth**: Hindi is 1 of 8 supported languages, not as deeply trained
- **Context reduction**: 128K becomes 8K when quantized for mobile

---

## Recommended GGUF Quantization

For NilaMind on Android with 4GB RAM:

**Primary choice: Q5_K_M** — Best quality/size balance
- Qwen2.5-1.5B-Instruct-Q5_K_M: ~1.2GB
- Fits comfortably in 4GB RAM alongside app
- Higher quality than Q4_K_M with minimal speed loss

**Fallback: Q4_K_M** — If RAM is tight
- Qwen2.5-1.5B-Instruct-Q4_K_M: ~1.0GB
- Slightly faster inference
- Acceptable quality loss

**Avoid: Q3_K_M or lower** — Too much quality degradation for empathetic conversation

---

## Inference Speed Estimates (Android ARM64)

Based on Meta's Llama-3.2-1B benchmarks (OnePlus 12, ARM CPU):

| Model | Quantization | Est. tok/s | Est. RAM | TTFT |
|---|---|---|---|---|
| Gemma-3-1B | Q4_K_M | ~50 | ~1.2GB | ~0.3s |
| Llama-3.2-1B | Q4_K_M | ~46 | ~1.3GB | ~0.3s |
| Qwen2.5-1.5B | Q4_K_M | ~35 | ~1.5GB | ~0.4s |
| Qwen2.5-1.5B | Q5_K_M | ~32 | ~1.6GB | ~0.5s |

All models should achieve >30 tok/s at Q4_K_M on modern ARM64 devices, which is adequate for conversational response times.

---

## Final Recommendation

**Use Qwen2.5-1.5B-Instruct (Q5_K_M GGUF) as NilaMind's brain model.**

Rationale:
1. Apache 2.0 license = no commercial restrictions
2. Best Hindi support at this parameter scale
3. 32K context = adequate for multi-turn wellness conversations
4. 1.5B params = sweet spot for quality vs. RAM usage
5. Extensive GGUF quantization ecosystem
6. Trained on 18T tokens = massive knowledge base
7. Resilient to diverse system prompts (persona consistency)

**Fallback: Gemma-3-1B-IT (Q5_K_M GGUF)** if:
- You need smaller model size (1B vs 1.5B)
- You need faster inference (>50 tok/s)
- You stay under 50M MAU (Gemma license threshold)
- You prioritize Google's safety training

---

*This comparison was compiled from HuggingFace model cards, official documentation, and benchmark reports as of July 2026.*
