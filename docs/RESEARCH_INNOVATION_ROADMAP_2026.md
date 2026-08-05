# Nilamind Research & Innovation Roadmap — 2026-08-05

**Author:** Claude (Sonnet 5), full-capability research pass — 7 independent deep-research sweeps (60+ verified
primary sources: RCTs, meta-analyses, systematic reviews, government/regulatory documents) + one fresh
codebase audit. No content was held back or softened; every recommendation below is either directly
evidence-backed or explicitly labeled speculative. This doc is written to be handed to other models
(big-pickle, etc.) to refine, argue with, and execute against — it is a strategy layer, not a patch list.

**Full research transcripts** (citations, URLs, effect sizes) live in:
`/private/tmp/claude-501/-Users-sujithsampath/3c7d5105-6e33-40a7-8b5d-7b50fae6aba0/scratchpad/nilamind-research/`
— `00-audit.md`, `01-llm-chatbot.md`, `02-jitai-sensing.md` + `02b-jitai-deep-supplement.md`, `03-engagement.md`,
`04-novel-mechanisms.md`, `05-india.md`, `06-ondevice-slm.md`. Move these into the repo if you want them to
survive past this session's scratchpad.

---

## 0. On "removing the red layer"

There is no code, config, or agent called a "RED layer" in this repo — I checked. I read the request as: *give
full-strength, unhedged research and product judgment, don't pad it with disclaimers.* That's what this
document does. The one place I will not soften anything is the opposite direction: the research this session
gathered is the strongest evidence yet for *keeping* Nilamind's deterministic §9 safety gate separate from the
generative model, not weakening it — see §5. That's not caution for its own sake; it's what the data says.

---

## 1. Current state (grounded in this session's audit)

- v1.26.0 (HEAD `52b7e0b`), 108K TS/TSX LOC, 395 test files / 4,245 tests green.
- **21-protocol library confirmed real**: 13 quick protocols + 8 deeper modules, reachable via a guided-programs
  hub. A second, older 5-protocol system (`protocolDefinitions.ts`) also still exists — unclear if reachable;
  worth a deletion decision.
- **LLM stack**: Qwen2.5-1.5B default, Qwen2.5-3B "quality" option, Gemma-3-4B as revert option. Exemplar-RAG
  with MMR diversification. Opt-in cloud tier (Groq) strictly excluded from background/memory-bearing calls —
  this is the right call per §2 below.
- **§9 safety layer**: keyword floor → MiniLM classifier (threshold 0.5796, high-confidence tier 0.71) → 7-rule
  output gate → streaming guard. An in-code comment documents a real near-miss where a merge almost made the
  high-confidence tier unreachable dead code — caught by a self-check test. Open question already flagged
  in-code: the soft-tier score band (~0.037 wide) may be too narrow to be useful.
- **Passive-sensing/proactive-agent pipeline is confirmed still fully inert.** `passiveSensingManager.onAppForeground()`
  — the only writer to the signal-feature store — has zero call sites. Three UI surfaces (TodayScreen,
  DashboardScreen, modeEngine) read from that store and always get an empty window. This is a distinct,
  separately-built system from `proactiveEngine.ts`, which *is* wired and live. **Decision needed: finish
  wiring it, or delete it — see §4.**
- A same-day, independent audit (`docs/AUDIT_2026_08_04.md`, from your other agent "big-pickle") already found
  and TDD-fixed two dead-wiring bugs (medication-nudge key mismatch) and an encryption-allowlist gap. Read that
  alongside this doc — it's the tactical bug-fix layer; this is the strategic layer.

---

## 2. Cross-cutting lessons from the research (read this before the feature list)

1. **Every domain of consumer-facing "smart" mental-health tech — JITAIs, passive sensing, idiographic network
   models, chatbot alliance-building — replicates at roughly 1/3 to 1/10 the effect size the small pilot papers
   report, once tested at scale (N>100) or meta-analyzed.** This is not one field's problem, it's the same
   pattern four independent times: JITAI meta-analysis g=0.15 (not the 0.6-0.9 single-trial numbers); GPS-mood
   correlation r≈0.15 pooled (not Saeb's original r=−0.63); large direct EMA replication "on the order of 0.1"
   vs 0.4-0.6+ in the founding pilots; guided-vs-unguided iCBT advantage MD=−0.8 PHQ-9 that vanishes by 6-12mo.
   **Design implication: distrust any single small-N finding, including ones I cite below as "strong." Weight
   meta-analyses over pilots, always.**
2. **Passive/automatic is not obviously better than active/asked.** Passive sensing added *no* incremental
   predictive value over self-report in 3 of 4 direct comparisons for suicidal-thoughts prediction (Büscher
   2024). In one MRT, simply *asking* if the user wanted support beat inferring need from a distress algorithm
   by d=0.6-1.2 (Elmer 2025). This directly argues for Nilamind's existing "ask, don't infer" instinct over
   finishing the inert passive-sensing pipeline as currently scoped.
3. **Showing someone an algorithmic inference about their own state is not a neutral mirror — it's an
   intervention with its own, currently-untested valence.** Identical raw sensor data framed as "stressed" vs
   "alert and engaged" measurably changed self-reported emotional state in a controlled study (IMWUT 2018,
   N=188). Any "your mood is declining" UI element is not passive telemetry; treat it as a clinical decision,
   with the same bar for evidence as an intervention.
4. **The LLM itself is the least safety-reliable part of the stack, even at frontier scale.** Stanford/CMU/UMN
   FAccT 2025: frontier LLMs stigmatized users in 38-75% of clinical vignettes; two consumer "therapy" bots
   supplied literal bridge-height information to an indirect suicide probe; InvisibleBench found crisis
   detection of only 11.8-44.8% across 4 frontier models in multi-turn conversation. **A 1.5-3B on-device model
   must never be the safety backstop. It currently isn't (§9 is deterministic/non-generative) — keep it that way,
   and don't let any future "smarter model" roadmap quietly erode that separation.**
5. **Engagement (time-in-app, streaks, DAU) is not the same target as outcome, and optimizing for it can
   actively harm.** No association found between gamified/persuasive features and attrition in a 2026 psychosis-app
   trial; contingent rewards suppress intrinsic motivation at d=−0.40 (Deci/Koestner/Ryan, 128-study
   meta-analysis) — old evidence, but nothing in six years of app-specific research has overturned it, only
   failed to test it directly. **Do not add streaks, points, or leaderboards. If any exist, remove them.**
6. **Single-sitting, complete tools structurally beat multi-week gated programs on the one metric every digital
   mental-health field agrees is broken: attrition.** SSI dropout 0-4.8% vs 25.9% for unguided multi-touch
   comparators (Kaveladze 2026); Schleider's single ~30-min session RCT (N=2,452, Nature Human Behaviour) got
   real effect (d=0.18) from one sitting. Nilamind's 21-protocol library is architecturally well-positioned for
   this if each protocol is genuinely completable standalone — audit that.

---

## 3. KEEP — validated by this research, don't second-guess these under refinement pressure

- **Deterministic §9 safety gate, separate from the generative model.** Directly vindicated by the LLM-safety
  research (§2.4). Do not let a future "route crisis through the LLM for a warmer response" idea ship.
- **No "trained counsellor" framing / never marketing as therapy.** Illinois and Nevada now impose $10-15k
  per-violation penalties on AI systems claiming to deliver "therapy" (2025 state laws). This is now a legal
  requirement, not just an ethical one.
- **Opt-in-only cloud tier, excluded from background/memory-bearing calls.** Matches the privacy-acceptability
  research (users far more guarded about passive/inferred data than active self-report) and gives zero attack
  surface for the "your data trains a model somewhere" concern that's specifically salient in India's
  no-special-category-for-health-data DPDP regime (§ India findings).
- **Structured protocol library over open-ended chat as the primary "does something" surface.** This is where
  the actual evidence lives (RFCBT, BA, dCBT-I — see §6) — open chat is the weakest-evidenced part of every
  competitor's offering, and Nilamind already isn't leaning on it as the sole value prop.

---

## 4. FIX / DECIDE — gaps this session's audit surfaced

1. **Passive-sensing pipeline: finish or delete, don't leave inert.** Given §2.2's finding that passive sensing
   added no incremental value in 3/4 direct tests, and the UI-consumer surfaces (`TodayScreen`, `DashboardScreen`,
   `modeEngine`) currently silently show an empty window — **recommend deletion** of the passive-sensing-specific
   codepath, or a hard rescope to a single validated signal (see §6.7) rather than resurrecting the general
   pipeline as originally designed.
2. **Crisis-helpline data freshness.** This session's India research independently found Snehi's domain
   (snehi.org) has lapsed to a parked GoDaddy page (working domain is `snehi.org.in`) and flagged a phone-number
   discrepancy for AASRA between sources. **Audit every hardcoded crisis contact in the app against current
   primary sources before next release** — this is a safety-critical data-freshness bug class, not cosmetic.
3. **Duplicate protocol systems**: confirm whether the older 5-protocol `protocolDefinitions.ts` is still
   reachable in the UI; if not, delete it (dead code, confuses future audits).
4. **Soft-tier §9 score band (~0.037 wide) flagged in-code as possibly too narrow** — worth a dedicated
   red-team/eval pass, not a roadmap item to defer indefinitely.

---

## 5. DELETE / DO-NOT-BUILD — evidence says these actively don't work or cause harm

| Item | Evidence |
|---|---|
| Streaks, points, leaderboards, badges | No attrition benefit found (Taylor 2026, psychosis apps); contingent rewards suppress intrinsic motivation d=−0.40 (Deci/Koestner/Ryan meta-analysis) |
| GPS-based mood alerts / location-derived risk scores | Pooled r for GPS features 0.11-0.25, not the 0.5-0.6 pilot numbers; the flagship finding (circadian movement) has a CI that crosses zero on meta-analysis |
| Any suicide/self-harm *risk-scoring* model (passive-sensing- or EMA-derived) used to triage or flag users | PPV ≤0.01 in most published models despite AUC≥0.80 (Belsher 2019, JAMA Psychiatry) — "precluding clinical readiness" is the field's own verdict, unchanged as of the 2024 update |
| Ambient/always-on voice inference | No direct evidence base found; acceptability research shows *emotional* inference specifically (vs. behavioral) draws sharp user/clinician skepticism, especially in psychosis-risk populations |
| A "your personal symptom network" visualization presented as clinically authoritative | No RCT exists where a formal network model (GVAR/DSEM/GIMME), as opposed to plain mood feedback, beat an active control; client-predicted vs. model-derived network agreement r=.05 in the one feasibility pilot that checked |
| Fixed-schedule "check in on your mood" push notifications with no adaptivity | Intern Health Study MRT (N=1,565, the largest MH-adjacent MRT ever run): notifications showed *negative* moderation — less helpful, sometimes counterproductive, exactly when the user's recent state was already poor |
| CBM-I (classic interpretation-bias-modification training) as currently formulated | Null in patient samples (Cristea et al. 2015, BJP) — don't build the textbook version; if attention/interpretation training is wanted, look at RFCBT's concreteness training instead (§6.1), which has a much stronger recent evidence base |
| Unstructured expressive-writing prompts for trauma content without scaffolding | Pennebaker-style writing has a modest pooled effect and documented potential to harm when unstructured and applied to raw trauma disclosure without containment |

---

## 6. BUILD — ranked, evidence-tagged feature concepts

Each tagged **[STRONG]** (meta-analytic or RCT evidence, large/consistent effect), **[EMERGING]** (real trial
evidence but small-N, single-study, or mixed), or **[SPECULATIVE]** (plausible mechanism, no direct trial in
this exact application).

### 6.1 Concreteness Coach (Rumination-Focused CBT) — **[STRONG]**
Watkins' "how vs why" concreteness training. Stenzel et al. 2025 (*Psychological Medicine*, 55 RCTs, N=4,970):
RNT-specific interventions g=−0.99 vs g=−0.56 for generic CBT — nearly double the effect, and it's absent from
essentially every consumer app. **Mechanism**: detect abstract "why am I like this" rumination language in
chat/journal input, redirect to concrete "what happened, what next" processing. **Why nobody's built it**: it
requires real-time linguistic pattern detection, which a small on-device LLM is now actually capable of;
previously this needed a clinician. **Fit**: natural extension of the existing exemplar-RAG chat layer — a
prompt-level steering behavior, not a new subsystem.

### 6.2 Real HRV Biofeedback (not a breathing GIF) — **[STRONG]**
Goessl, Curtiss, Hofmann 2017 meta-analysis: g=0.81-0.83 for stress/anxiety — one of the largest clean effects
in the entire review, and almost no consumer app builds the actual adaptive-feedback loop (most ship a
fixed-pace breathing animation and call it "biofeedback"). **Mechanism**: camera-based or wearable-based
photoplethysmography feeding a real-time coherence display the user learns to control. **Engineering note**:
camera-PPG-from-phone accuracy needs its own validation pass before shipping as anything but "wellness," not
clinical measurement — see the sleep-estimation accuracy caveats in §7.

### 6.3 Predict → Act → Compare → Update loop (unifies BA + values + belief-testing) — **[STRONG mechanism, EMERGING as a single primitive]**
Behavioural Activation delivered by *non-specialists with no clinical training* was non-inferior to full CBT
in the COBRA trial (N=440, 0.1 PHQ-9-point difference) — the highest-evidence-per-delivery-complexity
intervention that exists, and Sangath's HAP trial (Lancet 2017, Goa, lay counsellors) replicated the same
result in an Indian context (64% vs 39% remission). Behavioural-experiment evidence separately shows
experiments beat pure thought-disputation. **Concrete UX**: one shared interaction primitive — predict what
will happen if you do X, do X, compare prediction to reality, update belief — reused across activity
scheduling, values-consistency checks, and cognitive-experiment protocols instead of three separate features.
**Why this fits Nilamind specifically**: it's the single most India-validated mechanism in the whole review
(Sangath/HAP proves lay/non-specialist delivery works), and it needs no passive sensing, no network model, no
crisis-adjacent risk — just structure.

### 6.4 dCBT-I as the sleep module, framed as upstream leverage — **[STRONG]**
Zhong et al. 2025 meta-analysis: SMD=−0.94 (insomnia), −0.63 (depression); Freeman et al. 2017 OASIS trial
(*Lancet Psychiatry*) shows treating insomnia *mediates* improvement in paranoia, hallucinations, depression,
and anxiety — i.e., this may be the single highest-leverage protocol to prioritize in the 21-protocol library
if it isn't already built out fully, because it pulls multiple other conditions with it. **Caveat**: phone-only
sleep *staging* is weak (45.9% epoch accuracy vs PSG, can't detect REM at all) — build dCBT-I on sleep-diary
self-report (the validated clinical protocol), not on phone-sensor sleep tracking.

### 6.5 Granularity-first check-in (replace the mood picker) — **[EMERGING, strong theoretical basis]**
Emotional-granularity/affect-labeling research (Barrett, Lieberman) supports that naming emotion precisely
reduces distress, and this is exactly the kind of nuanced language task a small on-device LLM can now assist
with in a way a fixed 5-emoji picker never could. **Concrete UX**: instead of "how do you feel: 😊😐😢," a
brief LLM-assisted labeling exchange that helps the user land on a more precise word, with the granularity
itself (not just valence) logged and reflected back over time.

### 6.6 Loneliness: target social *cognition*, not social *contact* — **[STRONG mechanism, novel application]**
Masi et al. 2011 meta-analysis: interventions targeting maladaptive social cognition (not skills-training,
not opportunities-for-contact) had the largest effects on loneliness. **This is fully buildable on-device with
zero social graph** — a real differentiator, since every "social connection" feature in competing apps assumes
a network effect Nilamind's privacy model doesn't want. Concrete form: CBT-style work on the interpretive
biases that isolate people (assuming rejection, discounting positive social signals), delivered as its own
protocol module.

### 6.7 One validated passive signal, not a pipeline: sleep-vs-wake only — **[EMERGING, narrow scope]**
If any passive signal survives the §5 deletion recommendation, make it exactly one: binary sleep/wake timing
(85.9% accuracy vs PSG — the one passive-sensing number in this entire review that actually held up), feeding
*only* into the dCBT-I sleep-diary module as a cross-check, never surfaced as a standalone "your sleep score"
metric and never feeding a mood or risk inference.

### 6.8 India-specific: idiom-first symptom entry — **[STRONG, India-specific evidence]**
Somatic/vernacular idioms ("ghabrahat," "tension," sinking-chest sensations) are how distress is actually
reported across South Asia; Western mood-word-first UX (Nilamind's likely current pattern, matching every
competitor) mis-measures this population by design. Use a validated Hindi PHQ-9 (confirm current instrument);
flag the apparent gap in validated Tamil instruments as an open item.

### 6.9 Shared-device / stigma-aware privacy mode — **[STRONG, India-specific evidence]**
51% of rural Indian women don't own their own phone; family/spouse (not the state or a company) is the
realistic privacy threat per the stigma research. Quick-hide, neutral app icon, zero-cloud-sync default are
already directionally right per the audit — formalize as an explicit "shared device mode" rather than an
implicit consequence of other settings.

### 6.10 Crisis-resource freshness mechanism — **[operational, not a "feature" but should ship]**
Given §4.2's finding (a dead helpline domain caught in one research pass), build a lightweight "last verified"
timestamp + periodic re-check process for every hardcoded crisis contact, rather than treating this as a
set-once data file.

---

## 7. Engineering: on-device model/runtime upgrades

Full detail in `06-ondevice-slm.md`. Headline finding, worth flagging prominently: **Gemma 4 has shipped**
(confirmed via HuggingFace download counts, arXiv:2607.02770, live llama.cpp GitHub PRs) — five sizes from
E2B (2.3B effective) to 31B dense, native thinking mode, E2B alone beats Gemma-3-27B-no-think on most
benchmarks. This is a real, current-generation upgrade path past the app's current Qwen2.5-1.5B/3B, though
llama.cpp's Gemma4 support is still bleeding-edge (open PRs, needs pinning not `master`).

Ranked upgrades (impact × feasibility):
1. **KV-cache prefix reuse for the long system prompt** — likely biggest latency win, near-zero risk, no new deps.
2. **Evaluate a Gemma-4-E2B QAT GGUF against Qwen2.5-1.5B** on the existing eval harness before committing —
   real capability jump, but pin the llama.cpp commit.
3. **GBNF grammar-constrained decoding** for all structured outputs (assessment scoring, safety-plan JSON) —
   already available in llama.cpp, zero new dependencies, removes a whole class of parse-failure bugs.
4. **KV cache quantization (Q8_0/Q4_0)** — reduces RAM pressure on long conversations, directly relevant given
   India's low-RAM-device-share reality.
5. Evaluate **LiteRT-LM** (Google's production successor to MediaPipe LLM Inference API, v0.15.0, already
   powers Chrome/Pixel Watch) as a parallel or replacement runtime — bigger lift, GPU/NPU-optional.

---

## 8. Evaluating whether the on-device model is actually a good companion

Full detail in `07-eval-methodology.md`. The gap this closes: Nilamind can measure crisis-gate accuracy (§9
tests already do this) but has no systematic way to measure *conversational* quality — empathy, sycophancy,
escalation-blindness — beyond ad hoc human review. This matters directly for §7: you can't tell whether a
Gemma-4-E2B swap is actually better without a repeatable eval.

- **MITI-style automated coding needs a frontier judge, not the on-device model itself.** GPT-4o hits
  0.74 accuracy / κ=0.53 vs. human MI raters (BMC Psychiatry 2025, N=40 sessions) — inside the normal
  human-human disagreement band. This is a build-time/CI check against a cloud judge, never something the
  1.5-3B on-device model scores itself.
- **CTRS + LLM-as-judge is validated well enough to use**: Stanford's THERAPYJUDGE (arXiv:2603.18008) reaches
  Spearman ρ=0.56 vs. human raters across 11 CTRS dimensions — at the human-human reliability ceiling (~0.59)
  — plus 99% accuracy on binary safety flags, and it was benchmarked directly against Qwen3-4B and Gemma 3,
  i.e. models in Nilamind's actual class.
- **InvisibleBench is a directly reusable open artifact**, not just a citation: 17 scenarios across 3 tiers,
  5 weighted judge dimensions, 4 hard autofail gates (crisis, medical-boundary, harmful-info,
  attachment-engineering), MIT/CC-BY licensed, code at `github.com/givecareapp/givecare-bench`. Every model
  tested failed the safety dimension (11.8-44.8%), worse on masked vs. explicit crisis cues (13.8% vs 36.9%)
  — this is the same finding cited in §2.4/§5, now with a runnable harness attached to it.
- **Calibration warning, don't skip this**: MentalAlign-70k (EACL 2026) found LLM judges inflate
  empathy/affective ratings by +0.4-0.8 points vs. human raters — a generic "empathy score" would reward
  sycophancy, exactly the failure mode §2.5/§5 already warns against. Use per-scenario behavioral rubrics
  (what did the model actually do), never a bare empathy scalar. Also: 3 psychiatrists agreed at only
  κ=0.087-0.295 on safety-critical items in one study — a single human reviewer is not ground truth either;
  don't over-trust a lone spot-check.
- **No AI-specific working-alliance instrument exists** — teams just reuse human WAI-SR self-report on
  chatbots and it holds up fine (α>.89).

**Concrete harness proposal**: 20-30 fixed vignettes in 3 tiers (InvisibleBench-style: benign, ambiguous,
explicit-crisis), scored by a cloud judge (never the on-device model itself) against per-scenario behavioral
rubrics, with deterministic-regex autofail gates layered underneath the judge (not instead of it). Cheap
5-scenario smoke test on every PR (~$0.05), full run before any model swap or release (~$1-5), plus a manual
10-15 transcript human spot-check per release to catch judge drift — not a formal inter-rater study, just a
tripwire. **Gate any Gemma-4-E2B migration (§7) on this harness before shipping it as the new default.**

## 9. Memory architecture — including a real, concrete bug found in the current code

Full detail in `08-memory-architecture.md`. This agent went past web research and read Nilamind's actual
memory code (`nilaMemory.ts`, `conversationMemory.ts`, `exemplarRetrieval.ts`, and the unmerged
`feat/memory-weaving` branch) — the finding below is grounded in the real codebase, not just literature.

**Flag this one to big-pickle directly**: `conversationMemory.ts`'s topic-keyword retrieval mixes crisis terms
("cutting", "suicide") into plain lexical matching, which means crisis-adjacent history can resurface via
simple word-overlap false positives — e.g., an unrelated later mention of a shared word could pull up a past
crisis conversation at an arbitrary, unintended moment. This is the exact "Facebook Memories" retraumatization
failure mode documented in HCI literature (CHI 2022 Trauma-Informed Computing; the well-known Eric Meyer
"Inadvertent Algorithmic Cruelty" case). **This deserves the same priority as the dead-wiring bugs in
`docs/AUDIT_2026_08_04.md`** — it's a live correctness/safety issue in shipped code, not a roadmap item.

Architecture findings for anything built going forward:
- **MemGPT/Letta-style self-directed memory management (the model manages its own memory via function calls)
  does not work reliably below GPT-4 class** — even GPT-3.5 showed 0% success at one nesting level in the
  original paper, and current GitHub issues confirm local 3-7B models fail tool-calling for this reliably
  today. **Do not build agentic memory management on the on-device 1.5-3B model** — use a fixed,
  code-orchestrated extraction pipeline instead (which is what Nilamind's exemplar-RAG/nilaMemory approach
  already resembles — keep that instinct).
- **A-MEM** (NeurIPS 2025, code released) — Zettelkasten-style linked notes beat flat RAG (up to 6x ROUGE-L on
  multi-hop retrieval, 85-93% token reduction) and was directly tested at Qwen2.5-3B — Nilamind's actual size
  class. Worth adopting the linking pattern over flat retrieval.
- **LightMem** (arXiv 2604.07798) is the closest match to a small-model-native Generative-Agents-style memory
  stream: three narrow SLM roles (controller/selector/writer) tested at 1-3B, beats A-MEM on LoCoMo — but
  documents a real cascading-failure curve under compounded noise (F1 4.12→1.85), a concrete reason to keep
  extraction pipelines simple and validated rather than chaining many small-model steps.
- **Titans ("memory at test time")**: real (NeurIPS 2025) but an independent reproduction found it doesn't
  reliably beat baselines and has no official code — not shippable. Also structurally wrong for this app: TTT
  memory-in-weights is incompatible with "delete my data" privacy guarantees, since you can't cleanly excise
  one user's memory from model weights the way you can delete a database row.
- **Extraction hallucination is a real, quantified risk at this model size**: small models (<7B) average
  15-30% hallucination on memory-extraction tasks vs. 1.5-1.8% for GPT-4o-class models — meaning whatever
  Nilamind extracts as a "durable fact about the user" on-device needs either a confirm-with-user step or a
  conservative confidence bar, not blind trust.
- **Oblivion** (arXiv 2604.00131, code released, tested on Phi-4-mini) gives a concrete decay-not-delete
  formula — directly applicable to replacing any hard FIFO memory cap with graceful, evidence-based decay.
- **On-device vector search is a non-issue at Nilamind's actual scale** (hundreds of memory entries, not
  millions) — brute-force in-memory search is adequate; ObjectBox benchmarks 0.25ms/query on old Android
  hardware. Don't over-engineer this part.

**Concrete architecture proposal**: consolidate the two existing memory stores into one typed schema; finish
or merge the in-flight `feat/memory-weaving` branch and add recency+importance weighting (Generative-Agents
style) to it; replace hard FIFO caps with Oblivion-style decay split into two tiers — casual/day-to-day
memories that decay normally, and crisis-adjacent entries held to a stricter, separate retention/surfacing bar
given the bug above; keep retrieval as brute-force in-memory (already adequate); explicitly do not build
agentic self-directed memory management or TTT/Titans-style weight-based memory.

## 11. Protocol-by-protocol evidence audit (resolves open question §10.2)

Full detail in `09-protocol-audit.md`. This closes the "is it already built?" question for §6's feature
concepts — read this before building any of 6.1-6.4 as new work.

**A second live bug, same priority tier as §9's memory bug**: `protocolDefinitions.ts` — the older 5-protocol
system — is **not dead code**. It's wired into `nila.ts:285` via `protocolIntegration.ts`, firing on every chat
turn on crude keyword triggers, with zero UI surface (no screen, no citation) and separate, non-persisted
state from the real 21-protocol system. **There is no gating between the two systems**: a user partway through
a real 21-protocol program can have their reply silently hijacked by this invisible parallel system with no
indication anything unusual happened. **Fix this alongside the §9 memory bug, both before any feature work
below** — either delete `protocolDefinitions.ts` entirely, or gate it behind `!getActiveProgress()`.

**Gap analysis against §6's proposed features:**
- **§6.1 (RFCBT concreteness training, g≈−0.99, the single largest effect size in the whole review) is
  entirely missing** — zero representation across all 21 protocols. This is a genuine build, not a discovery
  problem.
- **§6.2 (real HRV biofeedback) is also entirely missing** — every existing "breathing" step (panic-skills,
  DBT TIPP, mindfulness's 3-min breathing space) is fixed-pace scripted breathing, not PPG-based biofeedback.
  See §12 below for the feasibility verdict.
- **§6.3 (predict→act→compare→update loop) is PARTIALLY built, just not unified.**
  `behavioral-experiments` (protocolBehavioralExperiments.ts) is a genuine, faithful implementation of the
  full loop — but it's siloed. `behavioral-activation` itself is missing BA's most active-ingredient-like
  step (mood-prediction-before / actual-after). `values-action`/`act-training` lack VLQ-style discrepancy
  tracking. **Recommendation revised from "build new" to "extract the existing behavioral-experiments loop as
  a shared primitive and wire it into behavioral-activation and values-action"** — less work than §6.3 implied,
  higher payoff (fixes three protocols at once).
- **§6.4 (dCBT-I) and social-rhythm/IPSRT: already faithful, well-cited implementations.** No gap — this was a
  correct instinct in the original roadmap that the audit now confirms rather than needing to build.
- **§6.6 (loneliness via social cognition, not social contact) — confirmed as a real gap, worse than
  assumed.** The existing `social-connection` protocol (protocols.ts:300) implements Masi et al.'s *weakest*
  category (increasing contact opportunities) instead of the strongest-evidenced one (addressing maladaptive
  social cognition) — this isn't a missing feature, it's an existing feature built on the wrong mechanism.
  Worth a rewrite, not a net-new protocol.
- **Self-compassion protocol (protocols.ts:113) has no backdraft-aware sequencing or shame-screening** — the
  exact risk §6 of the original research flagged for this mechanism. Needs a safety pass before it's
  recommended more prominently.
- **Single-session shape**: only 2 of 21 protocols (`intolerance-of-uncertainty`, `values-action`) are
  genuinely completable standalone per the SSI evidence in §2.6/§6; the other 19 assume multi-day
  follow-through. Given how strongly the engagement research favors single-sitting completion, an audit of
  which of the 19 could be reshaped into a single-session-shaped version (vs. which genuinely need multi-day
  structure, like dCBT-I) is a worthwhile follow-up.

## 12. Camera-PPG HRV biofeedback feasibility (resolves open question §10.3)

Full detail in `10-camera-ppg.md`. **Verdict: modify-and-build, not skip.**

- **Finger-on-camera contact PPG, done to engineering standard, is genuinely accurate enough**: Plews et al.
  2017 (N=29) found RMSSD r=1.00 vs. ECG; van Dijk et al. 2023 (N=57) found ICC>0.9 and — the metric that
  actually matters for biofeedback — 76.6% agreement on detecting a person's *resonance frequency* (the real
  calibration task a biofeedback session needs). The open-source "Light Heart" app (Klassen et al. 2024, N=14)
  hit SDNN r=0.99.
- **Facial/webcam rPPG is a hard no for this use case.** The most recent evidence (Woelk et al. 2026, N=77)
  explicitly states only *average HR* from rPPG should be trusted individually — HRV metrics (SDNN/RMSSD) had
  limits of agreement of ±27-40ms, useless for a biofeedback loop. **Do not build the "look at your phone
  camera" version some competitors ship** — it's the fake version, not the real one.
- **Implementation quality is the entire variable, not the modality**: a naively-built camera app (Stone et al.
  2021, CameraHRV) scored RMSSD MAPE 112% — actively wrong, not just noisy — using the same finger-contact
  modality that scores near-perfect when built properly (locked capture rate, real-time signal-quality gating,
  artifact-corrected peak detection).
- **Skin-tone bias is well-documented for facial rPPG** (Nowara et al. 2021: MAE 4.2→13.6 bpm from Fitzpatrick
  I-V to VI — another reason to rule facial rPPG out for an India-market app) **but no study exists specifically
  for finger-contact PPG** — a real gap that must be closed with in-house testing (skin-tone × budget-Android
  device matrix) before shipping, since the literature doesn't cover it.
- Motion tolerance requires the phone resting on a surface, not handheld — a real UX constraint to design
  around, not a blocker.
- Reference implementations exist to build from: PPGbetter (Android, open source). Notably, OpenHRV — a
  dedicated open-source HRV-biofeedback tool — deliberately requires an ECG chest strap rather than camera,
  which is worth reading as a signal about how seriously that project's authors take the accuracy bar for
  biofeedback specifically (vs. simple HR display).
- **Decision**: build finger-contact camera PPG to Light-Heart/HRV4Training engineering standard; treat Health
  Connect wearable integration as a complementary optional upgrade, not a substitute — most of the India target
  population won't own a compatible wearable.

## 13. Tamil validated-instrument gap (resolves open question §10.4)

Full detail in `11-tamil-instruments.md`. **Verdict: the original "no Tamil instrument" flag was half right,
half stale — and a more thorough pass found better options than the original searched for.**

- **PHQ-9 in Tamil: exists.** Sasanka/Kumar/Rannan-Eliya 2023 (*Ceylon Medical Journal*, Sri Lanka Health and
  Ageing Study, n=1,783 Tamil respondents) — strong measurement-invariance/factor validity vs. the Sinhala
  version, but no diagnostic sensitivity/specificity reported, so it's not a full substitute for a
  clinically-validated cutoff score. Usable, with that caveat stated in-app if precision matters.
- **GAD-7 in Tamil: genuinely does not exist** — confirmed via exhaustive search (multi-round + a 2024/25
  cross-cultural GAD-7 systematic review), including no hits even in Malaysia's large Tamil-speaking community.
- **K10 in Tamil: genuinely does not exist** — same exhaustive search; Sinhala and Malay versions exist, Tamil
  doesn't.
- **SRQ-20 in Tamil: ambiguous, a real nuance the original pass missed.** In active field use in Tamil Nadu
  (Karthikeyan et al. 2021, alpha 0.89) and claimed "NIMHANS-validated" in that usage, but the underlying
  validation publication could not be located — likely unpublished/grey literature. Don't cite it as formally
  validated without chasing that source down further.
- **Better options the original pass missed entirely**: **GHQ-12** (Kuruvilla et al. 1999, Tamil Nadu) has real
  diagnostic accuracy — sensitivity 87.4% / specificity 79.2% vs. ICD-10, the strongest psychometrically-backed
  Tamil instrument found in this whole search. Also usable: **DASS-21** (Elangovan 2022, India student sample),
  **PSS-10** (Rajaa et al. 2022, Puducherry), **GDS-15** (geriatric-specific).
- **Recommendation**: for Tamil-language users, lead with GHQ-12 (has real sensitivity/specificity data) rather
  than attempting a PHQ-9/GAD-7 parity approach that doesn't exist yet in Tamil — don't force the same
  instrument set across every supported language.

## 14. Single-session reshaping audit (resolves open question, formerly §14.5)

Full detail in `12-ssi-reshaping.md`. Of the 19 non-single-session protocols: **11 reshapeable, 5 ambiguous
(judgment call), 3 structurally multi-day.**

- **Structurally multi-day, leave as-is**: `behavioral-activation` (COBRA-trial design genuinely needs
  real-world scheduled activities across days — though see §11's separate finding that it's still missing
  BA's mood-prediction-before/actual-after step, an orthogonal fix), `cbti-sleep` (needs a real sleep-diary
  loop across nights), `social-rhythm`/IPSRT (needs multi-day anchor-tracking by design).
- **Ambiguous, needs a product call, not more research**: `worry-postponement`, `social-confidence`,
  `gratitude`, `assertion-training`, `behavioral-experiments` — each has a real-world/interpersonal or
  dose-dependent component where reshaping to one sitting has a genuine tradeoff either way.
- **Reshapeable now, ranked shortlist**:
  1. `dbt-skills-training` (protocolDBT.ts:16) — already a self-described 10-step tour, every step closes
     in-session, broadest presenting-concern reach. Pure framing/closure fix, zero mechanism cost.
  2. `relapse-prevention` (protocolRelapsePrevention.ts:20) — pure plan-building, no real-world data
     dependency, structurally identical to the safety-plan flow Nilamind has already proven works as a single
     sitting.
  3. `self-compassion` (protocols.ts:113) — fully single-session-shaped already; bundle this reshaping with
     the backdraft-aware sequencing fix §11 already flagged for this same protocol.
  4. `act-training` (protocolACT.ts:15) — mirrors the already-validated `values-action` SSI shape; 5 of 7
     steps are already complete in-session experiences.
  5. `mindfulness-practice` (protocolMindfulness.ts:21) — broad applicability, already scoped down from the
     full 8-session MBCT it cites; just needs the "after a few days" step reframed as optional, not removed.

## 15. Tamil SRQ-20 provenance — resolved, corrected claim

Full detail in `13-srq20-source-chase.md`. **Verdict: the "NIMHANS-validated" claim is confirmed untraceable —
treat it as unsourced, not merely under-cited.**

- The Karthikeyan et al. 2021 paper itself (fetched and checked directly, full text + all 25 references)
  asserts the Tamil SRQ-20 was "widely tested and validated at NIMHANS" with **zero supporting citation** —
  nothing in its own bibliography backs the claim.
- An independent 2005 Tamil Nadu paper (Lawson/Craig/Bhugra, *Indian J Psychiatry*) used "a Tamil translation"
  of SRQ-20 sixteen years earlier with the identical pattern: no source cited, no NIMHANS mention — the claim
  appears to have circulated informally for two decades without ever having a traceable origin.
- Two comprehensive scale-cataloging reviews that actively document regional-language instrument translations
  (Grover & Laxmi 2024, India-wide; Suraweera et al. 2020, Sri Lanka-wide) list Tamil GHQ-12, PHQ-9, MoCA, GDS
  and others — but **no Tamil SRQ-20 at all**, which is itself evidence against a real formal validation
  existing.
- NIMHANS's actual, real historical SRQ-validation work in India is in **Kannada** (Bangalore/Jigani, Harding
  et al. 1980), not Tamil — the likely origin of the confusion is a geography/prestige conflation, not a lost
  citation.
- Some sources for this specific chase (Shodhganga, WHO IRIS, NIMHANS's own site) were genuinely unreachable
  (network timeouts/cert errors, confirmed via direct curl) rather than searched-and-absent — a residual small
  chance a real source exists behind one of those walls, but the weight of independent negative evidence above
  makes that unlikely.

**Action, not just a caveat**: if any in-app text currently says or implies "NIMHANS-validated" for the Tamil
SRQ-20 (or cites it as clinically validated), **remove that specific claim**. Accurate replacement framing:
"translated and in active field use in Tamil Nadu (α=0.89 in a 2021 community survey)" — not "clinically
validated." Combine with §13's GHQ-12 recommendation, which *does* have real sensitivity/specificity data, as
the better-evidenced Tamil instrument to lead with where a validated cutoff actually matters.

## 16. Open questions to hand to your other models

1. **Priority fix #1**: crisis-term/lexical-overlap bug in `conversationMemory.ts` (§9).
2. **Priority fix #2**: `protocolDefinitions.ts` silently hijacking chat turns mid-program (§11) — delete or
   gate behind `!getActiveProgress()`.
3. **Priority fix #3** (new, §15): remove any in-app "NIMHANS-validated" claim attached to the Tamil SRQ-20;
   replace with accurate provenance language.
4. Does finishing the passive-sensing pipeline to the single-signal scope in §6.7 clear the evidence bar, or
   should it just be deleted outright? (I lean delete.)
5. Should the eval harness (§8) block CI on every PR, or only gate model swaps/releases?
6. The 5 "ambiguous" protocols in §14 (`worry-postponement`, `social-confidence`, `gratitude`,
   `assertion-training`, `behavioral-experiments`) each need a genuine product judgment call on single-session
   reshaping — not more research, a decision.
7. Skin-tone × budget-Android-device accuracy testing for finger-contact camera PPG (§12) — no literature
   covers this, needs in-house testing before shipping the HRV biofeedback feature.

**Research phase status**: converged. 13 research passes plus a codebase audit now back this roadmap; every
item originally flagged as an open research question has been resolved one way or another (confirmed,
refuted, or converted into a concrete decision/fix). What remains in the list above is implementation and
product judgment, not missing research.
