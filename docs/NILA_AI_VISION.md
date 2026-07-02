# NilaMind — the vision for AI usage

> North-star reference. Every AI/model decision in NilaMind is designed *against this doc*.
> The only metric is **help**: does this make Nila genuinely more useful to a person who is suffering?
> If a change trades the person's trust, privacy, or safety for anything else, it does not ship.

## What Nila is

Nila is not a feature bolted onto the app — she **is** the app's relationship with the person. Tools,
skills, and tracking are scaffolding for that relationship. She is a warm, steady companion who happens to
understand mental health deeply, grounded quietly in real therapy (DBT, CBT, ACT, self-compassion), and she
is deliberately **bounded**.

## The spine — principles that govern every AI decision

1. **Strictly scoped, never general-purpose.** Nila is for mental-health companionship *inside* NilaMind —
   not a bot you ask to write emails or answer trivia. Out-of-scope asks are gently redirected. This scoping
   is also the single biggest anti-hallucination move: a narrow model on a narrow task is reliable.
2. **Grounded, not free-associating.** She reflects the person's own words and surfaces *vetted,
   evidence-cited* skills (`skillRetrieval.ts` over the curated `skillsLibrary.ts`). She never invents a
   technique or a fact.
3. **On-device and private, always.** Her brain and the person's patterns live on the phone. Patterns are
   computed for the person and shown back to them — never harvested, never cloud analytics on the person.
4. **Safety is model-independent.** §9 (crisis) and output-safety are deterministic (`sendToNila.ts`:
   `shouldBlockForCrisisAsync` before the model, `applyOutputSafety` after; `elevationGuard` for mania). A
   smaller/faster model changes *speed*, never safety.
5. **Invited, not intrusive.** AI acts when *pulled* — opening a chat, a user-armed "check on me" — not by
   autonomous push. Reflection is off-by-default, ≤1/day.
6. **One source of support, never the only one.** Always points toward real human and professional care;
   never claims to replace it.

## Where AI shows up — and where it must not

**Shows up:**
- **Companion chat** — the core: warm, listening, evidence underneath.
- **Skill surfacing** — offers ONE vetted skill when it truly helps, openable in-app.
- **Episode support** — a calmer, tool-less Nila for manic/crisis moments (episode prompt).
- **Reflection / inflection** — gently names a real shift in the person's *own* trajectory (opt-in).
- **Memory** — remembers what matters (asked-first, on-device, user-viewable and deletable).
- **User-armed check-ins** — a "check on me" pull, never an autonomous nag.

**Must NOT:**
- Diagnose or label ("this sounds like [disorder]").
- Nag or push autonomously.
- Become a general-purpose chatbot.
- Gather data or run cloud analytics on the person.
- Replace human or professional care.

## Reliability — zero garbage, zero hallucination (a BLOCKING requirement)

Nila is not a facts bot, so "hallucination" here is not "makes up trivia." The real failure modes for a
mental-health companion, and the guard for each (none of which trusts the model to be smart):

| Failure mode | Guard |
|---|---|
| Invents a therapy technique | **Skills-RAG grounding** — she can only surface skills that exist in the vetted library. |
| Unsafe / crisis mishandling | **Deterministic §9** — caught before the model runs and gated after; model-independent. |
| Incoherent / garbage prose | **Eval gate before ship** — coherence + grounding are a NO-GO; we ship only what passes. |
| Role confusion / samey replies | Training data 0% patient-voice; low temp (0.4) + brevity cap. |
| Mirroring the user's distortions | Memory stores **derived, safe** insights only; never raw spirals, never from unsafe moments. |

**Because a confident-but-wrong claim about someone's mental state is actively harmful**, the pattern layer
is **deterministic and conservative** (a reliable-change threshold), not the LLM guessing. Reliability is the
enabling constraint for everything else — especially reflection.

## How Nila learns you — compounding memory, not a mutating model

The personalization that deepens with use comes from a **growing on-device memory retrieved into the
conversation** — **not** from the LLM retraining its weights on the person's chats.

- **Compounding memory** — durable, typed insights accumulate as the person talks (a stable fact about them,
  what they're working through, what's helped).
- **Daily on-device reflection** — quietly derives new insights from recent conversations.
- **Personal context injection** — `buildPersonalContext()` (`nilaContext.ts`) folds the relevant memory into
  every prompt, so Nila walks in already knowing what matters.
- **Personal-memory RAG (as the store grows)** — retrieve the *most relevant* insights for this moment rather
  than dumping the whole history in. Keeps it fast and focused; personalization deepens without bloat.

**Why the model itself does not adapt per-user:** on-device weight-training isn't feasible on the phone
runtime, and more importantly it would *break* reliability — a model that continually retrains on one
person drifts, overfits to recent moods, forgets its training, and starts mirroring their distortions and
eroding §9. Keeping the model **fixed and safe** while growing the **memory around it** is what makes Nila
both personalised *and* trustworthy.

**Speed and personalization pull the same rope.** Shortening the runtime persona (V3 lever A) frees context
budget; that freed room now holds richer retrieved memory about the person. Faster *and* more personal.

## How this governs the on-device model (V3)

- The brain is a small, **fine-tuned-for-Nila** model (not a stock small model — that's why the old generic
  1B was garbage). It ships as a GGUF via llama.cpp, same runtime as today's 4B.
- **A candidate cannot ship unless it clears the reliability gate** (coherence + grounding + §9-independence +
  no role-confusion, evaluated in the deployment shape). Ship the *smallest that passes*; otherwise keep the
  larger model. Reliability is never traded for speed.
- Personalization stays in the **memory + retrieval** layer, which is model-agnostic — so swapping the brain
  for a faster one never resets what Nila knows about the person.

_See `research/V3_FAST_PLAN.md` (levers + candidates) and `research/rs-spike/runpod/V3_RUN.md` (how to train)._
