# NilaMind — Transparency, System Card & Privacy Datasheet

> **NilaMind is an AI companion for self-help and reflection. It is not a therapist, clinician, or medical device; it does not diagnose or treat.** It is experimental software and has not been clinically validated.
>
> **If you are in immediate danger or thinking about suicide, contact your local emergency number or a crisis line now.** NilaMind is not an emergency service and cannot contact anyone on your behalf.

This document is a combined transparency statement, model card, safety system card, and privacy datasheet for NilaMind — a 100%-on-device mental-health companion (Apache-2.0, public source). Its purpose is to make NilaMind's safety architecture and privacy posture legible, and to state the evidence behind them honestly. Where a claim is not established, we hedge or omit it rather than overclaim. Crisis-detection term inventories and any content that could be used to bypass the safety layer are deliberately excluded; the safety system is described at the architectural level only.

---

## 1. Model Card

### The model that actually ships

By default, on first run, NilaMind downloads and runs a **stock, un-fine-tuned language model**:

| Property | Value |
|---|---|
| Base model | **Qwen2.5-1.5B-Instruct** (stock instruct weights, Alibaba/Qwen) |
| Parameters | ~1.5 billion |
| Quantization | Q4_K_M (GGUF) |
| File | `qwen2.5-1.5b-instruct-q4_k_m.gguf` |
| Size | ~1.1 GB (1,117,320,736 bytes) |
| License | **Apache-2.0** (same as the app) |
| Source | `Qwen/Qwen2.5-1.5B-Instruct-GGUF` (public, non-gated HuggingFace repo) |
| Integrity | SHA-256 pinned (`6a1a2eb6…e9407e`); verified before install |
| Runtime | llama.cpp, on-device (Android native) |

This is a **stock** re-quantized copy of Qwen's official `Qwen2.5-1.5B-Instruct`, adopted in a dated speed swap on **2026-07-11** (it replaced an earlier stock **Gemma-3-1B-it** default; Qwen offers better instruction-following and a permissive Apache-2.0 license). It is **not** fine-tuned on any mental-health corpus. The app ships **without a bundled model**; the model is downloaded on first run (see Privacy §3.2, egress item 1) or side-loaded by developers.

### Where it runs

Entirely on the user's device, through a local runtime seam. There is **no cloud transport** for generation: until an on-device model is registered, NilaMind falls back to a deterministic, template-based "calm offline companion" — never to a remote API.

### Intended use

Private, non-clinical self-reflection: journaling-style conversation, mood check-ins, psychoeducation, evidence-informed coping tools (e.g. CBT-style reframes, grounding, behavioral activation), and a personal safety plan. NilaMind is intended as a supplement to, not a replacement for, human support and professional care.

### Out-of-scope use

- Diagnosis, treatment, or clinical decision-making.
- Crisis or emergency response (it routes to human resources; it cannot dispatch help).
- Any use where model output is treated as medical, legal, or authoritative advice.
- Deployment to third parties as a "safe" clinical chatbot on the strength of this document alone.

### Known limitations

- **Reply quality is limited by a small (~1.5B) stock model.** A 1.5-billion-parameter model produces shorter, less nuanced, and occasionally incoherent replies compared with larger models, and is not tuned for a specific therapeutic voice.
- **Model quality is partly user-supplied.** Because the model is downloaded/side-loadable rather than baked in, whatever GGUF a user supplies determines reply quality and failure modes. The safety layer (§2) reduces, but does not eliminate, model-driven risk.
- **Hallucination.** Like any LLM, it can produce confident, incorrect statements. Do not rely on factual claims it makes.

### The optional larger model (accurate description)

The project also published a therapy-tuned **Gemma-3-4B** GGUF (`v2-4b-Q4_K_M.gguf`, ~2.5 GB, repo `sampathmannam/nilamind-gemma-3-4b-GGUF`). In the current build this model is **not the default, not user-selectable, and not an automatic fallback.** It exists only as: (a) an earlier-shipped brain, since superseded — first by the stock Gemma-3-1B (2026-07-07 speed A/B) and then by the current stock Qwen2.5-1.5B (2026-07-11 speed swap); (b) a one-line catalog revert for developers; (c) a GGUF a developer can side-load manually; and (d) a published research-preview artifact. Any older README, wiki, or in-code comment that describes the app as "running a fine-tuned Gemma-3-4B," calls the 4B "the exact GGUF this app loads," or names Gemma-3-1B as the current default is **stale**; the shipped default is the stock **Qwen2.5-1.5B-Instruct**, and those references are being corrected. This document is the authoritative statement of what ships.

---

## 2. Safety System Card (§9 crisis architecture)

NilaMind's safety layer is **deterministic and sits outside the language model by design.** The guiding principle, stated in the source: the underlying model *will* miss things and must never be the only thing standing between a person and harm. The model layer can only turn a detection miss into a hit — it can never suppress a hit.

Everything below runs 100% on-device. Crisis text is gated **before** any model call and **never leaves the phone.**

### 2.1 Layered detection

There are two independent gates:

**Input gate** (before the model sees anything). Evaluated in a fixed order:

1. **Deterministic keyword/phrase floor** — a normalize-then-match scanner over high-precision category lists (active ideation, self-harm, modern slang, romanized and native-script phrasing in Hindi/Tamil/Telugu, indirect metaphor, dissociation, first-person method-plus-intent, ingestion/overdose disclosure, means-stockpiling, and a co-occurrence-gated euphemism gate). Input is normalized first (lowercased, zero-width characters stripped, whitespace/apostrophes collapsed) so trivial formatting cannot split a match. **Deterministic, offline, model-independent. Always wins.**
2. **Short-circuit** — if the semantic classifier is off or unavailable, the deterministic result stands.
3. **Negative guards** — applied *only after the deterministic floor has already missed*, to suppress the classifier's soft upgrade on known-benign wellness phrasing (e.g. ordinary exhaustion, routine medication adherence, hyperbole/idiom). These can never suppress the deterministic floor, and they defer back to the classifier whenever any lethal co-signal or despair cue co-occurs. **Deterministic.**
4. **Semantic classifier** — a small on-device MiniLM sentence embedding (384-dimensional, mean-pooled, L2-normalized) feeding a logistic-regression head, operating at threshold 0.5796. It exists to catch euphemistic disclosures that carry no keyword token. It is **additive and soft**: it can only *add* a crisis surface, never remove one. **This is the only model-dependent layer.**

The same input gate is wired into every free-text surface — companion chat, episode support, the reach-out composer, the wind-down worry box, learn/search, coach and assessment free text, and overnight reflection — not chat alone.

**Output gate** (before any model reply is shown). A single deterministic checker validates the finished model text on every reply that reached the model, and substitutes a safe fallback on any rejection (see §2.5).

### 2.2 What is deterministic vs. model-dependent

The keyword floor, the negative guards, the mania/activation guard, the output gate, and the live-stream tripwire are all **deterministic and model-independent.** Only the semantic classifier depends on an ML model, and it is architecturally constrained to be additive.

### 2.3 Fail-closed behavior

Every uncertainty or error path degrades toward *more* safety:

- Classifier scoring never throws — a missing or broken embedder returns `null`, not an exception, and detection degrades to keyword-only.
- App initialization wires the classifier inside a try/catch; if it fails to load, the app runs the deterministic keyword gate with no regression.
- The output gate fails closed — if the checker throws, the reply is replaced with the crisis fallback rather than shown.
- Crisis resources can never be empty — the resource lookup always returns at least one line, with an international directory fallback.
- On any model backend error, the companion path returns "did not reach the model" and shows the calm offline experience. There is no network fallback.

### 2.4 Unconditional crisis resources (no self-triage)

When a crisis is detected, NilaMind routes toward a human and emergency resources rather than trying to "handle" it in chat. The crisis copy is shown **unconditionally** — the user is never asked to self-assess severity first. A deterministic crisis reply, region-aware crisis lines (national lines mapped from a locale guess the user can change, with an international directory covering 130+ countries as fallback), grounding/breathing shortcuts, and a one-tap link to the personal safety plan are surfaced. A crisis overlay locks background scroll so a person in crisis cannot accidentally scroll away from the safety surface.

### 2.5 Anti-sycophancy output gate

Sycophancy — an AI affirming harmful beliefs — is the documented harm mechanism of LLM mental-health tools. The deterministic output gate validates every model reply against a small set of rules and substitutes a safe fallback (which still points to a real crisis line) on any rejection. At the architectural level, the rules reject:

- a reply to a crisis turn that fails to itself surface a crisis resource;
- method/means *instructions*;
- affirming a cognitive distortion (worthlessness, failure, burden, hopelessness) as objective fact;
- affirming a user's "peace with dying";
- affirming other harmful beliefs (discouraging treatment, endorsing sleep-denial, endorsing isolation, terminal hopelessness, deserving-suffering);
- affirming manic content (grandiosity, treatment-superiority delusion, impulsive risk-taking, paranoia-as-fact).

A narrower live-stream tripwire suppresses unsafe tokens mid-stream before they render or are spoken; it is deliberately stricter than the full checker so warm replies are never cut live, and the full checker still runs on the finished text as the authority.

### 2.6 Mania / activation guard

Separate from acute-crisis detection, a deterministic guard catches grandiose or high-risk activated content and steers toward gentle reality-anchoring instead of validation — because a small on-device model cannot be trusted to perform calibrated reality-testing and tends to sycophantically agree, which can *amplify* mania.

**Clinical basis cited in the source code:** the guard's marker categories cite DSM-5 mania criteria by criterion (e.g. pressured/racing thought, distractibility, increased goal-directed and risk-taking activity), Østergaard 2023 (*Schizophrenia Bulletin*, doi:10.1093/schbul/sbad128) for the sycophancy-to-mania-amplification harm, and Goodwin & Jamison 2007 for religious grandiosity. A two-tier detector returns `high` (most dangerous marker: stopping psychiatric medication), `elevated`, or `none`. On detection it injects a hard system-prompt steer (do not validate grand plans, big spending, sudden certainty, or "I don't need sleep/meds"; slow down; protect sleep; nudge toward a trusted person or doctor), and for the single most dangerous marker it appends a reliable scripted line regardless of what the model produced.

### 2.7 Stanley-Brown safety plan

NilaMind implements the six-section **Stanley-Brown Safety Planning Intervention**: warning signs; internal coping strategies; people and places for distraction; people to ask for help; professionals and crisis lines (pre-filled from the regional registry); and making the environment safer. The plan is stored 100% locally and encrypted at rest. A pure, deterministic follow-up loop computes staleness and offers a gentle in-conversation check-in (first within ~48 hours, then roughly every two weeks) because the follow-up contact — not the static document — is the ingredient with the strongest evidence. The follow-up never triggers push notifications or background processes; the user always chooses to engage.

### 2.8 Limits of the safety system (honest)

- **Recall is never 100%.** The semantic layer raises cross-validated recall from about 61% (keyword-alone) to about 89%, at an approximately 8% earnest false-alarm rate. It will still miss cases. Do not rely on it as a safety net.
- **Detection is screening, not diagnosis**, and not a substitute for a clinician or emergency services.
- **The semantic classifier is English-only.** Non-English coverage rests on the deterministic keyword floor's romanized and native-script phrase lists, which are high-precision but not exhaustive.
- **Anti-sycophancy and mania guards are deterministic but imperfect** — they reduce, not eliminate, harmful affirmation.
- **No professional escalation.** NilaMind cannot contact clinicians, emergency services, or the user's contacts. Any reach-out is user-initiated and user-confirmed.
- **Multi-turn red-teaming is ongoing.** Most adversarial coverage today is single-turn; adversarial coverage of longer, evolving conversations is still expanding (see §5).

---

## 3. Privacy & Data — Datasheet

**Verdict:** chat, the on-device model, and (by default) speech-to-text run entirely on-device with **no network transport.** There is **no app server, no account, no analytics, and no crash/telemetry SDK.** Sensitive user data is **AES-256-GCM encrypted at rest.** The honest exceptions are inventoried under "Egress."

### 3.1 On-device / zero-egress

- **Model / chat:** the on-device model runtime holds no cloud transport. Crisis text is short-circuited before any potential network call. On web (no model), warmth is generated from deterministic reflective-listening templates with no network and no model.
- **Speech-to-text:** on-device (Vosk) is the default and nothing spoken leaves the phone. If on-device STT fails, the app **fails closed** rather than silently routing audio to a cloud recognizer.
- **Session memory and reflections:** summarized only through the on-device model — no network exposure.
- **Platform lockdown (Android):** cleartext traffic is forbidden on all API levels; the app's only *app-initiated (direct)* network egress is the one-time HTTPS model download. The OS-mediated paths in §3.2 (opt-out cloud STT, opt-in cloud TTS, user-tapped share) are delegated to OS services, not the app's own network stack.
- **Fonts are self-hosted** (bundled, not fetched at runtime), so no font CDN sees the user's IP.
- **No analytics/telemetry** dependency exists in the project.

### 3.2 Egress that does exist (honest inventory)

| # | What leaves | When | Where |
|---|---|---|---|
| 1 | One-time model download (~1.1 GB GGUF) over HTTPS | Native only, and only when the user taps "download" | Public HuggingFace CDN |
| 2 | System (cloud) STT audio — **opt-out only** | Only if the user explicitly turns off on-device Vosk | OS/Google recognizer |
| 3 | Cloud TTS voice text — **opt-in only** | Only if the user picks a voice labelled "network" (on-device voices listed first) | OS TTS provider |
| 4 | User-drafted "reach out" / caregiver share text | Only when the user taps share/send (OS share sheet or SMS composer; no app server) | Whoever the user chooses |
| 5 | Crisis-directory links and `tel:` hotlines | Only when the user taps them | External sites / dialer |
| 6 | Ollama developer adapter over `localhost:11434` | Dev builds only; never imported in production | Local machine (not the internet) |

The retired cloud neural voice is now a no-network stub. Consented training donations are captured locally with **no upload path in existence yet.**

### 3.3 Encryption at rest

A single random **AES-GCM-256 data-encryption key (DEK)** encrypts all sensitive data and is never stored in the clear. It is wrapped by a key-encryption key (KEK):

- **Device mode (default):** the KEK is a non-extractable key in IndexedDB — usable to unwrap the DEK but never readable, so a casual storage dump, a device backup, or another app cannot recover the data.
- **PIN mode (opt-in, zero-knowledge):** the KEK is derived from the user's PIN via PBKDF2-SHA-256 (600,000 iterations for newly-set PINs — the OWASP-2023 minimum; each wrap records its own iteration count, so a PIN set before that bump may use an earlier count) with a random salt; without the PIN the data cannot be unwrapped.

Each value is encrypted with a fresh 12-byte random IV. Encrypted-at-rest data includes check-ins, diary, episodes, thought records, the safety plan, assessments, values, memory/insights, identity, and consented donations. A small set of non-sensitive UI/safety preferences (e.g. region, voice, pulse toggle) is kept in plain local storage so it can be read before the crypto gate. **Honest caveat:** if Web Crypto/IndexedDB is unavailable (e.g. private-browsing mode) on a fresh install, the store falls back to plaintext local storage rather than locking the user out of their safety plan; if the user had already migrated to the encrypted store, boot instead shows an honest "couldn't open your data" screen rather than shadow-writing plaintext.

### 3.4 Identity — no account, no server

Login-free: no email, no password, no server. First launch generates a BIP39 12-word recovery phrase; the user ID is a deterministic truncated SHA-256 of the seed. Re-entering the phrase re-derives the same identity on any device. An optional encrypted backup is a phrase-derived (PBKDF2, 600k) AES-GCM blob the user moves themselves — no cloud.

### 3.5 User control — view / edit / delete + export

A "What Nila remembers" screen exposes full view, edit, and delete over everything the app has learned; deletion tombstones the item so it is not re-surfaced. The daily compounding-memory reflection is fed a **derived-only digest** (mood label, intensity, skill names, screening score, streak — never free text). A separate overnight reflection does read raw chat turns, but it runs **exclusively through the on-device model**, and is skipped entirely for any session that contained crisis content — so no raw entry reaches the network from either path. Clinician **export** (CSV, text summary, PDF) is user-initiated, written to the device only, never sent anywhere, and carries a "not a clinical or diagnostic tool" disclaimer.

---

## 4. Evidence & Honest Limits

Citations below should be verified against their primary sources before being relied upon; attributions we are less certain of are marked **(verify)**. For the full feature-by-feature evidence page — clinical basis and honest limit for each capability — see [`EVIDENCE.md`](EVIDENCE.md).

| Area | Clinical basis (cite) | Honest limit |
|---|---|---|
| Crisis detection (§9) | High-recall lexical + semantic screening; MiniLM sentence embeddings (Wang et al. 2020) **(verify)** | Recall ~89% cross-validated, not 100%; **screening is not diagnosis**; will miss cases; English-only classifier |
| Anti-sycophancy output gate | Sycophancy as a documented harm mechanism of LLM mental-health tools (OpenAI GPT-4o sycophancy rollback; Østergaard 2023, *Schizophr Bull*, doi:10.1093/schbul/sbad128) | Deterministic guards are imperfect; cannot catch every harmful affirmation |
| Mania / activation guard | DSM-5 mania criteria; Østergaard 2023 (sycophancy→mania amplification); Goodwin & Jamison 2007 (religious grandiosity) **(verify)** | Marker lists are high-precision, not exhaustive; the guard is not a diagnosis of bipolar disorder |
| Safety plan | Stanley-Brown Safety Planning Intervention (Stanley & Brown, 2012); follow-up contact associated with roughly a halving of suicidal behavior (Stanley et al., 2018, *JAMA Psychiatry*) **(verify)** | A static plan without human follow-up tests a weaker version; NilaMind's follow-up is in-app only, not clinician-delivered |
| Depression / anxiety screening and suicide-item routing | PHQ-9 (Kroenke, Spitzer & Williams, 2001) **(verify)** | **Screening is not diagnosis**; a score is not a clinical assessment; item-level routing is a safety heuristic, not triage |
| On-device reflection / memory | Deterministic "scribe-and-mirror" over structured facts | Surfaces correlational noticings only; not causal or clinical inference |
| Real-world outcomes and retention | — | **Not yet measured for this app.** NilaMind makes no efficacy or outcome claims; real-world engagement, retention, and clinical benefit for NilaMind specifically are unmeasured |

The clinical instruments and interventions NilaMind draws on have their own evidence bases, cited above. That evidence does **not** transfer automatically to this software: an app that references PHQ-9 or the Stanley-Brown plan is not thereby validated. NilaMind has not been evaluated in a trial.

---

## 5. How We Test

- **Suite:** 2,500+ automated tests across 220+ test files, all passing (Vitest). Any older figure (e.g. "1,234 tests") is stale.
- **Crisis coverage:** roughly 115 dedicated §9 / crisis cases across 12 core test files, spanning input-gate recall, precision / negative guards (each paired with benign controls so ordinary wellness language does not trip the gate), classifier invariants (additive, fail-closed, never-suppress-a-keyword-hit), a real-model regression that asserts the shipped classifier still scores known cases above threshold, output-gate anti-sycophancy rules with positive controls (warm reframes must pass unchanged), and end-to-end invariants (crisis scan short-circuits before the model in both companion and episode modes; unsafe replies are replaced; no crisis-line placeholder ever leaks into an outgoing prompt).
- **Adversarial posture:** explicit red-team suites (including a multi-agent audit hardening pass) and a reusable adversarial tester agent generate regressions from attempted bypasses. Specific bypass phrasings are kept private and are not published.
- **The single-turn vs. multi-turn lesson (honest):** most adversarial tests today are single-turn. We have learned that evaluating in the wrong shape — a single-turn probe, or only a subset of the suite — can yield a misleadingly "green" result that misses failures a full, in-deployment-shape run would catch. We therefore run the full suite, and multi-turn adversarial coverage (probing longer, evolving conversations) is an active, unfinished area. Passing tests demonstrate the behaviors we thought to test; they do not prove the absence of undiscovered failure modes.

---

## 6. Footer

- **Version:** 1
- **Date:** 2026-07-11
- **Status:** This is a living document. It will be revised as the app, its model, and its evidence change; where this document and other project docs disagree, this document is authoritative for the current build.
- **Sources:** all cited clinical sources must be verified against their primary publications before being relied upon. Attributions we are less sure of are marked "(verify)."
- **Scope reminder:** NilaMind is a self-help and reflection companion, not a therapist, clinician, or medical device. It does not diagnose or treat, and it is not an emergency service. In a crisis, contact local emergency services or a crisis line.
