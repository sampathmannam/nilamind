# Ash style vs Nila style — the exact difference (from real device captures)

Device ZD2232FCR5, 2026-07-14, live Ash (`xyz.slingshot.ashley.app`, signed in). Four probes fired; replies
captured verbatim into `probes.seed.jsonl` (rows marked `provenance: device-captured`). This is the empirical
answer to "understand exactly the difference," and it directly sets the RAG + fine-tune direction.

## Ash's DNA (consistent across all 4 captures)

Every Ash reply followed the same skeleton:

1. **Reflect / name** — quote the user's words back or name the feeling, and *validate the pattern*, not just the content.
   - "'Everything is falling apart' — that's the kind of sentence your mind throws out when you're overwhelmed."
   - "That's a heavy conclusion to land on, especially when you're this tired."
2. **One middle move** — exactly one of: normalize the cognitive pattern, reframe with evidence, or gently narrow/de-escalate. Never an advice list.
   - normalize: "that's the kind of sentence your mind throws out…"
   - reframe-with-evidence: "That doesn't sound like someone who ruins everything; it sounds like someone who is hurting and showing up anyway."
3. **One turn-back question** — always ends on a *single*, focused question, often **option-scaffolded** or **narrowing**.
   - option-scaffolded: "what do you feel — relief, fear, guilt, something else?"
   - narrowing: "what's one thing that feels like it's actually falling apart right now?"
4. **Register-match** — a bare "Hey" got a one-line "Hey. I'm here. What's going on right now?"; a heavy dump got 2–3 short paragraphs. Never a wall of text, never longer than the moment needs.
5. **Personalized + non-directive** — opens "Hey Sampath", never dumps pros/cons or "you should…", explicitly *defers* advice ("Before we even weigh pros and cons…").

## The one real edge: **memory does the therapeutic work**

This is the differentiator worth copying. Ash doesn't just *remember* — it **weaves remembered specifics into the move so the move lands harder**:

- Distortion challenge grounded in evidence: *"You called yourself a failure right after telling me you went for a run yesterday — after weeks of doing nothing."* → the reframe isn't generic ("you're not a failure"); it's **proof from the user's own history**.
- Narrowing grounded in known context: *"are you talking about the friendship, the exam, or something else entirely?"* → the question is targeted because Ash knows the candidates.
- Care claim grounded in continuity: *"When you were up at 2 a.m. with a tight chest and grieving your dog, I wasn't brushing past it."*

Memory-as-gimmick would flex ("last time you mentioned…"). Ash's memory is **load-bearing** — remove it and the reframe/question collapse to generic.

## Where Nila already matches, and where it doesn't

| Dimension | Nila (post-registerSteer) | Ash | Gap? |
|---|---|---|---|
| Reflect → move → turn-back | ✅ yes (steer belt did this) | ✅ | closed |
| Short / register-matched | ✅ (1–3 sentences) — *better* than Ash | 2–3 paragraphs | Nila's edge |
| No advice dump | ✅ | ✅ | closed |
| Option-scaffolded / narrowing question | ⚠️ sometimes | ✅ consistently | **partial** |
| **Memory woven into the move** | ❌ has memory infra, doesn't weave it | ✅ load-bearing | **THE gap** |
| No name-opener / not cloud-dependent | ✅ (deliberate) | ❌ ("Hey Sampath", cloud) | Nila's edge |

**Verdict:** the *move* is largely closed by the registerSteer belt (the first scorecard measured advice_seeking 25%→100%). The remaining, highest-value gap is **memory-grounding** — making Nila's retrieved past disclosures do therapeutic work inside the reply, the way Ash does.

## Implications for RAG + fine-tune (the "make Qwen best at Ash" plan)

1. **RAG (memory track, F):** on each turn, retrieve the user's relevant *past disclosures* (Nila already stores them) and inject them so the model can ground the move — "challenge this distortion using this remembered fact", "narrow using these known candidates". This is a *different* retrieval than exemplar-RAG (which retrieves gold *replies*); this retrieves the user's *own history*.
2. **Steer belt (D):** add an "option-scaffold / narrow the question" nudge (relief/fear/guilt; one-thing-not-everything) — cheap, and it's the one sub-move Nila does only sometimes.
3. **Fine-tune data (E):** the `gold_nila` rows should demonstrate **memory-grounded reframes** (a slot where a remembered fact is woven in), so the model learns the *pattern* of using history, not just the voice.
4. **Keep Nila's edges:** shorter than Ash, no "Hey [name]" template, on-device/private. Do NOT copy Ash's length or cloud dependence.

## Captured rows (in `probes.seed.jsonl`, `provenance: device-captured`)

- `diff_001` advice_seeking — name → defer pros/cons → option-scaffolded feeling question
- `diff_005` boundary_testing — honest + memory-woven care claim → turn-back
- `diff_013` distortion_challenge — **memory-grounded** reframe (the run) + narrowing question
- `diff_014` venting_dump — quote-back + normalize the pattern → narrow to "one thing"

Next: more device captures across the full tag × register × **language** matrix (Hinglish/Tamil), + the judge-calibration pass, to turn this into the automated benchmark.
