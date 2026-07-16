# In-moment insight: semantic redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Why you might feel this way" card's keyword-overlap matching and blind per-state fallback with the app's existing on-device embedding retriever, add repeat-avoidance, and roughly double the psychoeducation library (22 → 44 topics).

**Architecture:** `deriveInMomentInsight` (`src/services/inMomentInsight.ts`) becomes async and calls the already-integrated `embeddingSearchPsychoed` (`src/services/psychoedRetrieval.ts` — same on-device MiniLM model that warms at app startup and already grounds Nila's own chat replies) instead of the lexical `searchPsychoed`. A small pure function, `pickExplainer`, owns the post-retrieval decision logic (state tie-break, repeat-avoidance) so it's unit-testable with hand-built score arrays, independent of the embedder. If the embedder throws (not yet warmed, or absent in a test environment — this is the normal path in `ModeScreen.test.tsx` today), the resolver fails open to the existing deterministic `searchPsychoed`, so nothing regresses when no ML model is available. `ModeScreen.tsx`'s send handler gets one extra `await` at the existing call site.

**Tech Stack:** TypeScript, React, Vitest. On-device MiniLM-L6-v2 embeddings via `@huggingface/transformers` (already bundled, no new dependency).

## Global Constraints

- §9 crisis gate (`scanForCrisis`) must remain the first, unconditional check in `deriveInMomentInsight` — a crisis message never gets a wellness explainer.
- No new network calls, no new model download — reuse the existing MiniLM pipeline via `embeddingSearchPsychoed`/`setPsychoedEmbedder` in `src/services/psychoedRetrieval.ts`.
- No new persistence — the insight stays a UI-only field on the in-memory `NilaUiMessage` (`insight?: InMomentInsight`), never written to disk, never sent on the wire.
- Every psychoeducation topic's `basis` field must cite a real, correctly-attributed source. Where a citation carries a caveat (contested replication, non-peer-reviewed origin, active scientific debate), the caveat must be reflected honestly in the card's own body text, not smoothed over.
- `npm run lint` (`tsc --noEmit`) and `npm test` (`vitest run`) must both be green before any commit that finishes a task.

---

### Task 1: Expand the psychoeducation corpus to 44 topics

**Files:**
- Modify: `src/services/psychoed.ts` (add 22 new entries to `PSYCHOED_TOPICS`, defined at `src/services/psychoed.ts:24-252`)
- Modify: `src/services/psychoed.test.ts`
- Modify: `src/services/psychoedRetrieval.test.ts`

**Interfaces:**
- Consumes: nothing new — `PsychoedTopic` interface (`src/services/psychoed.ts:6-15`) is unchanged; new entries follow its existing shape (`id/title/summary/body/basis/tags`, optional `emergencyCaveat`).
- Produces: 22 new topic ids that Task 2's tests reference by id: `grief-dual-process`, `anger-appraisal`, `guilt-vs-shame`, `boredom-attention`, `relationship-conflict-patterns`, `boundaries-dearman`, `fawn-response-appeasement`, `heartbreak-rejection`, `perfectionism-clinical`, `imposter-phenomenon`, `catastrophizing`, `all-or-nothing-thinking`, `decision-fatigue`, `social-comparison`, `health-anxiety`, `burnout-mismatch`, `chronic-pain-mood`, `work-demand-control`, `procrastination-mood-repair`, `life-transitions`, `ambivalence-seeking-help`, `post-traumatic-growth`.

- [ ] **Step 1: Update the corpus-size and caveat assertions in `psychoed.test.ts` (red)**

In `src/services/psychoed.test.ts`, make these three edits:

1. Line 11, inside `"has exactly 22 topics, each fully populated + cited"`:
```ts
    expect(PSYCHOED_TOPICS).toHaveLength(44);
```
(also rename the test title to `"has exactly 44 topics, each fully populated + cited"`)

2. Lines 26-27, inside `"physical-symptom topics ... carry the emergency caveat"`:
```ts
    const withCaveat = PSYCHOED_TOPICS.filter((t) => t.emergencyCaveat).map((t) => t.id).sort();
    expect(withCaveat).toEqual([
      "anxiety-alarm",
      "chronic-pain-mood",
      "health-anxiety",
      "panic-passes",
      "stress-hpa-axis",
      "trauma-body",
    ]);
```

3. Line 52, inside `"empty query returns all topics in corpus order"`:
```ts
    const all = searchPsychoed("");
    expect(all).toHaveLength(44);
```

4. Line 60, inside `"returns only relevant topics for a specific query (drops zero-score)"`:
```ts
    expect(res.length).toBeLessThan(44);
```

- [ ] **Step 2: Update the corpus-size assertion in `psychoedRetrieval.test.ts` (red)**

In `src/services/psychoedRetrieval.test.ts` line 59, inside `"returns all topics for empty query (browse mode)"`:
```ts
    const results = await embeddingSearchPsychoed("");
    expect(results).toHaveLength(44); // full corpus
```

- [ ] **Step 3: Run tests, confirm both files fail on count mismatch**

Run: `npm test -- psychoed`
Expected: FAIL — `psychoed.test.ts` and `psychoedRetrieval.test.ts` both report `expected 22 to be 44` (or similar) on the edited assertions; all other tests in those files still pass.

- [ ] **Step 4: Add the 22 new topics to `PSYCHOED_TOPICS`**

In `src/services/psychoed.ts`, insert the following 22 objects into the `PSYCHOED_TOPICS` array, immediately after the `sleep-debt-and-anxiety` entry and before the array's closing `];` (currently line 251-252):

```ts
  {
    id: "grief-dual-process",
    title: "Grief isn't a straight line",
    summary:
      "Grieving naturally swings between facing the loss head-on and taking a break to keep living — both sides of that back-and-forth are healthy, not a sign of doing it wrong.",
    body:
      "It's common to expect grief to move through fixed stages toward 'closure.' In practice, many people find themselves oscillating: some moments confronting the loss directly — the memories, the missing — and other moments turning toward ordinary life — work, plans, small distractions — and back again. Both are part of coping, not a failure to grieve 'properly.' The oscillation itself, not arriving at some final stage, is what research suggests helps people adapt over time.",
    basis: "Stroebe & Schut 1999, Death Studies (dual-process model: oscillation between loss-oriented and restoration-oriented coping).",
    tags: ["grief", "loss", "grieving", "bereavement", "mourning", "died", "death", "miss them", "missing"],
  },
  {
    id: "anger-appraisal",
    title: "What's actually behind anger",
    summary:
      "Anger usually follows a quick mental read that something is unfair, threatening, or blocking what you want — understanding that read is what makes anger something to examine, not just react to.",
    body:
      "Anger can feel like it comes out of nowhere, but it typically follows an appraisal — a fast, often unconscious judgment that a rule's been broken, a boundary crossed, or a goal blocked — paired with physical arousal and an urge to act. Many people find it useful to pause and ask 'what did I just decide was unfair or threatening?' rather than only the anger itself. That question doesn't make the anger wrong; it opens up whether the read was accurate and what response actually fits.",
    basis: "Novaco 1975, Anger Control (cognitive-arousal-behavioral model of anger); DiGiuseppe & Tafrate 2007, Understanding Anger Disorders, Oxford University Press.",
    tags: ["anger", "angry", "rage", "furious", "irritated", "frustrated", "snap", "resentful", "mad"],
  },
  {
    id: "guilt-vs-shame",
    title: "Guilt and shame aren't the same feeling",
    summary:
      "Guilt says 'what I did was wrong' and points at an action; shame says 'I am wrong' and points at your whole self — the difference matters for what helps.",
    body:
      "The two feel related but pull in different directions. Guilt targets a specific behavior ('I shouldn't have said that') and tends to motivate repair — an apology, a fix, doing better next time. Shame targets the self as a whole ('I'm a bad person') and tends to motivate hiding, withdrawing, or attacking back — none of which actually repairs anything. Many people find it steadying to ask, when something feels bad, 'is this about something I did, or about who I think I am?' — because only one of those has a clear next step.",
    basis: "Tangney & Dearing 2002, Shame and Guilt, Guilford Press.",
    tags: ["guilt", "shame", "ashamed", "embarrassed", "bad person", "did something wrong", "self-blame"],
  },
  {
    id: "boredom-attention",
    title: "Why boredom feels so uncomfortable",
    summary:
      "Boredom isn't just 'nothing to do' — it's attention failing to lock onto anything, and many people find naming it eases the restless discomfort that comes with it.",
    body:
      "Boredom can feel surprisingly heavy — restless, irritable, hard to sit with — even when nothing is actually wrong. One way to understand it: boredom shows up when attention can't engage with an activity, your surroundings, or your own thoughts, and you notice and dislike that stuck feeling. It isn't only about lacking stimulation; plenty of understimulating moments don't feel boring. Many people find that naming it ('this is boredom, not something worse') and gently redirecting attention — rather than reaching for the nearest distraction — helps it pass without escalating.",
    basis: "Eastwood, Frischen, Fenske & Smilek 2012, Perspectives on Psychological Science (boredom as attention-engagement failure).",
    tags: ["bored", "boredom", "empty", "nothing to do", "restless", "numb", "understimulated"],
  },
  {
    id: "relationship-conflict-patterns",
    title: "Four patterns that make conflict worse",
    summary:
      "Certain ways of arguing — attacking the person, contempt, defensiveness, shutting down — tend to deepen conflict rather than resolve it. Naming them gives you something specific to notice and interrupt.",
    body:
      "Not all conflict is equally corrosive. Research observing couples in conflict identified four recurring patterns: criticizing the person rather than the specific behavior ('you always...' vs. 'when you did X...'), contempt (eye-rolling, mockery, sarcasm), defensiveness (deflecting instead of hearing the point), and stonewalling (shutting down and withdrawing). None of these are unusual — most people do at least one under stress. Many people find it helps simply to notice which pattern just showed up ('that was contempt, not just frustration') as a first step toward a different response, rather than treating conflict itself as the problem.",
    basis: "Gottman 1994, Why Marriages Succeed or Fail; Gottman & Levenson 1992, Journal of Personality and Social Psychology (patterns of criticism, contempt, defensiveness, and stonewalling in conflict).",
    tags: ["conflict", "argument", "fight", "relationship", "criticism", "contempt", "defensive", "stonewalling", "shut down", "partner"],
  },
  {
    id: "boundaries-dearman",
    title: "A structure for saying no clearly",
    summary:
      "Asking for what you need or saying no doesn't have to come out as a blunt refusal or an over-explained apology — a simple structure can help it land clearly and stay calm.",
    body:
      "Boundary conversations often go one of two ways: swallowed entirely (resentment builds) or blurted out sharply (guilt builds). A structured alternative: describe the situation factually, express how you feel about it without accusation, ask clearly for what you want, and reinforce why it matters — while staying calm and open to a response, not just delivering a verdict. Many people find that having a structure to lean on makes the moment feel less like a confrontation and more like a request, which is often exactly what it is.",
    basis: "Linehan 1993, Skills Training Manual for Treating Borderline Personality Disorder, Guilford Press (DEAR MAN — DBT interpersonal effectiveness skill).",
    tags: ["boundary", "boundaries", "say no", "people pleaser", "standing up", "assertive", "dearman"],
  },
  {
    id: "fawn-response-appeasement",
    title: "When the body's response to threat is to appease",
    summary:
      "Fight and flight are well known; many clinicians also describe a pattern of appeasing or pleasing in response to threat — a learned way of staying safe, not a character flaw.",
    body:
      "The nervous system has more than one way of responding to feeling unsafe. Alongside fighting back or fleeing, the body can shift into a state oriented toward connection and appeasement — going quiet, agreeing, smoothing things over — even when that isn't what you actually want. Some clinicians describe this pattern as 'fawning': a learned survival strategy, often from environments where conflict felt dangerous and keeping the peace felt safer. It is not formally established the same way fight-or-flight is, but many people recognise the pattern in themselves and find it clarifying: the instinct to please wasn't weakness, it was a nervous system doing what once kept things safe.",
    basis: "Porges 1995, Psychophysiology (Polyvagal Theory — autonomic nervous system states, including social engagement); 'fawning' itself is a clinical concept (Walker) describing appeasement as a trauma response, not yet formally peer-reviewed.",
    tags: ["people pleasing", "fawn", "appease", "can't say no", "conflict avoidant", "keep the peace", "freeze"],
  },
  {
    id: "heartbreak-rejection",
    title: "Why heartbreak can feel like withdrawal",
    summary:
      "Brain imaging of people recently rejected by a partner shows activity in reward and craving circuitry similar to what's seen in addiction research — which may be part of why heartbreak can feel like withdrawal, not just sadness.",
    body:
      "Romantic rejection can produce a specific, almost physical kind of longing that ordinary sadness doesn't quite capture. One study scanned the brains of recently-rejected people who still reported being in love while they viewed a photo of their ex, and found activation in reward, motivation, and craving regions — circuitry associated with addiction, though not identical to it. That may be part of why heartbreak can feel less like plain grief and more like a pull you're fighting. Many people find it reassuring to know the intensity has a real basis — it isn't 'just' being dramatic, and like other cravings, it does ease with time and distance.",
    basis: "Fisher, Brown, Aron, Strong & Mashek 2010, Journal of Neurophysiology, 104:51-60.",
    tags: ["heartbreak", "breakup", "broke up", "ex", "rejection", "romantic rejection", "can't stop thinking about them", "withdrawal"],
  },
  {
    id: "perfectionism-clinical",
    title: "Why perfectionism rarely feels like enough",
    summary:
      "When self-worth depends entirely on meeting impossibly high standards, even success rarely feels satisfying — and any shortfall reads as total failure rather than a normal miss.",
    body:
      "Wanting to do good work is not the problem. Clinical perfectionism is more specific: pursuing relentlessly high, self-imposed standards while measuring your entire self-worth by whether you hit them, then judging any shortfall in all-or-nothing terms. That combination is what keeps the payoff out of reach — meeting the standard barely registers ('I should have done even better'), while missing it feels like proof of failure. Many people find that separating self-worth from performance, even slightly, is what starts to loosen the cycle — not lowering standards, but no longer letting them set your value.",
    basis: "Shafran, Cooper & Fairburn 2002, Behaviour Research and Therapy, 40:773-791 (clinical perfectionism model).",
    tags: ["perfectionism", "perfectionist", "never good enough", "high standards", "all or nothing", "self-worth", "not enough"],
  },
  {
    id: "imposter-phenomenon",
    title: "Feeling like a fraud despite the evidence",
    summary:
      "Attributing your own success to luck, timing, or charm rather than ability — even with clear evidence of competence — is a well-documented pattern, not proof that you actually don't belong.",
    body:
      "The imposter phenomenon describes a specific gap: real, visible competence on one side, and a persistent inner conviction of being a fraud on the other — along with a fear that you'll eventually be 'found out.' Success gets explained away (luck, good timing, other people's generosity) rather than absorbed as evidence. It was first documented in high-achieving women and has since been found much more broadly. Many people find it steadies things simply to name the gap: the discomfort is a known pattern, not an accurate read of your actual ability.",
    basis: "Clance & Imes 1978, Psychotherapy: Theory, Research & Practice, 15:241-247.",
    tags: ["imposter", "impostor", "fraud", "found out", "don't belong", "not qualified", "fake it"],
  },
  {
    id: "catastrophizing",
    title: "Why the mind jumps to the worst case",
    summary:
      "Catastrophizing means automatically treating the worst possible outcome as the likely one — a common thinking pattern, and one that can be noticed and questioned rather than simply believed.",
    body:
      "Under stress, the mind often skips past the range of likely outcomes and lands straight on the worst one — a headache becomes something serious, a delayed reply becomes anger, a mistake becomes a disaster. This pattern, catastrophizing, tends to fuel anxiety because the worst case gets treated as fact rather than one low-probability possibility among many. Many people find it helps to ask two questions when they catch it happening: 'what's the most likely outcome, not just the worst one?' and 'if the worst case did happen, what would I actually do?' Both tend to shrink the catastrophe back down to size.",
    basis: "Ellis 1962, Reason and Emotion in Psychotherapy (coined the term); Beck, Rush, Shaw & Emery 1979, Cognitive Therapy of Depression (catastrophizing as a core cognitive distortion).",
    tags: ["catastrophizing", "worst case", "what if", "worst thing", "spiraling thoughts", "overthinking", "panic thoughts"],
  },
  {
    id: "all-or-nothing-thinking",
    title: "The trap of total success or total failure",
    summary:
      "Seeing a situation as either a complete win or a complete loss, with no middle ground, is a recognised thinking pattern that tends to deepen low mood — and it usually isn't the most accurate read.",
    body:
      "All-or-nothing thinking collapses a wide range of outcomes into two: perfect or ruined, good or bad, success or failure. A project that's 80% solid becomes 'a mess.' A mostly good day gets written off because of one bad hour. This pattern was identified as one of the recurring distortions that keep depression and anxiety going, because it discards almost all the actual information in favor of the two most extreme readings. Many people find it useful to look for the missing middle: not 'was it perfect,' but 'where does this actually fall.'",
    basis: "Beck, Rush, Shaw & Emery 1979, Cognitive Therapy of Depression (dichotomous / all-or-nothing thinking).",
    tags: ["all or nothing", "black and white", "perfect or nothing", "failure", "ruined", "messed up", "extreme thinking"],
  },
  {
    id: "decision-fatigue",
    title: "Why choices get harder as the day goes on",
    summary:
      "Some research suggests that making many decisions in a row can leave less in the tank for the next one — though later studies have found the effect smaller and less consistent than first thought.",
    body:
      "It's a familiar feeling: deciding what to eat, wear, or say can feel unexpectedly harder after a day full of smaller decisions, even trivial ones. Early research proposed that self-control and decision-making draw on a shared, limited resource that depletes with use. That idea has held up only partially — a large multi-lab replication years later found the effect much weaker and less consistent than the original studies suggested. What seems most durable is the everyday experience many people report: reducing the number of small decisions (routines, defaults, fewer choices for low-stakes things) can free up energy for the ones that actually matter, whatever the underlying mechanism turns out to be.",
    basis: "Vohs et al. 2008, Journal of Personality and Social Psychology, 94(5):883-898; replication concerns: Hagger et al. 2016, Perspectives on Psychological Science (multi-lab registered replication found a much smaller effect).",
    tags: ["decision fatigue", "too many choices", "can't decide", "overwhelmed by choices", "exhausted", "willpower"],
  },
  {
    id: "social-comparison",
    title: "Why comparing yourself to others feels automatic",
    summary:
      "People seem to have a built-in drive to measure themselves against others, especially without a clearer yardstick — and time spent on image-heavy social media has been linked to more of it.",
    body:
      "Comparing yourself to other people isn't a personal failing — it's been described as a basic drive, especially strong when there's no objective way to judge how you're doing (is this a good salary? a normal amount of anxiety? a good enough life?). In the absence of a ruler, other people become the ruler. Research on social media specifically has found that more time spent on image-focused platforms tracks with more appearance comparison and body-image concern, likely because the comparison points are curated and constant. Many people find it helps to notice when comparison has started ('I'm using them as my yardstick right now') rather than trying to stop comparing altogether, which is a much harder ask.",
    basis: "Festinger 1954, Human Relations, 7:117-140 (social comparison theory); Fardouly & Vartanian 2015, Body Image, 13:38-45 (social media use and appearance comparison).",
    tags: ["comparison", "comparing myself", "social media", "instagram", "jealous", "envy", "not measuring up", "everyone else"],
  },
  {
    id: "health-anxiety",
    title: "How ordinary body sensations become alarming",
    summary:
      "Health anxiety often builds when normal body sensations get read as signs of serious illness, and the very habits meant to feel safer — checking, searching, reassurance — end up keeping the worry alive.",
    body:
      "Bodies produce a constant stream of ordinary sensations — a twinge, a flutter, a bit of fatigue — that mean nothing most of the time. Health anxiety develops when some of those sensations get interpreted as signs of serious illness, which understandably triggers checking (the body, search engines, reassurance from others). The relief from checking is real but brief, which trains the checking habit further rather than resolving the worry — the mind learns 'checking is what makes this bearable' instead of learning the sensation was safe all along. Many people find that gradually reducing checking, uncomfortable as it feels at first, is what actually lets the alarm settle rather than what risks missing something important.",
    basis: "Warwick & Salkovskis 1990, Behaviour Research and Therapy, 28(2):105-117.",
    tags: ["health anxiety", "hypochondria", "googling symptoms", "checking my body", "scared it's serious", "symptom checking"],
    emergencyCaveat: EMERGENCY_CAVEAT,
  },
  {
    id: "burnout-mismatch",
    title: "Burnout is a mismatch, not a personal failing",
    summary:
      "Burnout is described as a growing mismatch between a person and their job — chronic exhaustion, detachment, and feeling less effective — rather than evidence that you simply aren't resilient enough.",
    body:
      "Burnout isn't just being very tired. It's described across three dimensions: exhaustion that doesn't lift with normal rest, growing cynicism or emotional distance from work you used to care about, and a creeping sense that you're not accomplishing much even when working hard. The framing that's held up best treats burnout as a mismatch — between demands and resources, values and reality, effort and reward — rather than a personal deficiency in resilience or toughness. Many people find that framing useful precisely because it points at the situation, not just the person, as something that may need to change.",
    basis: "Maslach & Leiter 1997, The Truth About Burnout; Maslach, Schaufeli & Leiter 2001, Annual Review of Psychology (exhaustion, cynicism, reduced professional efficacy).",
    tags: ["burnout", "burnt out", "exhausted", "work stress", "cynical", "detached", "can't keep going", "drained"],
  },
  {
    id: "chronic-pain-mood",
    title: "Why chronic pain and mood feed each other",
    summary:
      "Persistent pain isn't purely physical — biological, psychological, and social factors interact and reinforce each other, which is part of why chronic pain and low mood so often travel together.",
    body:
      "Short-term pain is mostly a straightforward biological signal. Chronic pain works differently: the biological injury or condition interacts with psychological factors (fear of movement, catastrophizing, mood) and social factors (isolation, work strain, how others respond to your pain) in a loop that can outlast — or exist independently of — the original physical cause. That's not a claim that chronic pain is 'in your head'; it's that all three layers genuinely shape how much pain is experienced and how disabling it is. Many people find that treatment addressing mood and behavior alongside the physical side (rather than physical treatment alone) makes more headway than either approach on its own.",
    basis: "Gatchel, Peng, Peters, Fuchs & Turk 2007, Psychological Bulletin, 133(4):581-624 (biopsychosocial model of chronic pain).",
    tags: ["chronic pain", "pain", "hurts", "exhausted from pain", "pain and mood", "persistent pain"],
    emergencyCaveat: EMERGENCY_CAVEAT,
  },
  {
    id: "work-demand-control",
    title: "What actually makes a job stressful",
    summary:
      "It isn't just how much is on your plate — the combination of high demands and low control over how you meet them is what tends to make work genuinely stressful.",
    body:
      "Two jobs can have identical workloads and feel completely different: one grinding, one merely busy. A model built from studying job stress found that the key variable isn't demand alone — it's demand combined with control. High demands paired with real autonomy over how, when, and in what order the work gets done are far less taxing than the same demands with no say at all. Many people find this reframes a stuck feeling at work: the problem may not be 'too much to do' so much as 'no control over how I do it' — which points at a different, more specific thing to try to change.",
    basis: "Karasek 1979, Administrative Science Quarterly, 24(2):285-308 (job demand-control model).",
    tags: ["work stress", "job stress", "overworked", "no control", "overloaded", "workload", "burnout"],
  },
  {
    id: "procrastination-mood-repair",
    title: "Procrastination is often about mood, not laziness",
    summary:
      "Putting something off is frequently an attempt to escape the bad feeling attached to the task right now — which brings quick relief, at the cost of a bigger, more anxious task later.",
    body:
      "Procrastination is usually framed as a time-management problem, but the pattern more often looks like emotion regulation: a task carries some unpleasant feeling (boredom, anxiety, self-doubt), and avoiding it makes that feeling go away immediately. The relief is real, which is exactly why the pattern repeats — present-moment mood wins over future consequences, even when you know it will cost more later. Many people find it helps to name what feeling the task is triggering, rather than treating procrastination as a discipline failure — because the fix for 'I'm avoiding a feeling' is different from the fix for 'I'm lazy.'",
    basis: "Sirois & Pychyl 2013, Social and Personality Psychology Compass, 7(2):115-127.",
    tags: ["procrastination", "procrastinating", "avoiding", "putting off", "can't start", "last minute"],
  },
  {
    id: "life-transitions",
    title: "Why change feels harder than the event itself",
    summary:
      "A widely used model describes any life change as having its own internal process — letting go of the old situation, a disorienting middle, and a new normal — separate from the external event.",
    body:
      "A new job, a move, a relationship ending, even a change you chose and wanted — the practical event is often only part of what's hard. A well-known practitioner model describes an internal transition process that runs alongside the external change: an ending (letting go of the old role, routine, or identity), a neutral zone (disoriented, in-between, not fully anywhere), and a new beginning (a new normal starting to feel real). It's not an empirically tested theory, but many people find it clarifying, because the disorientation of the 'neutral zone' often gets mistaken for something going wrong, when it's just the middle of an ordinary process.",
    basis: "Bridges, Transitions: Making Sense of Life's Changes, 1979 — a widely used practitioner model, not an empirically validated theory.",
    tags: ["transition", "change", "new job", "moving", "big change", "adjusting", "in between", "new normal"],
  },
  {
    id: "ambivalence-seeking-help",
    title: "Feeling unsure about getting help is normal",
    summary:
      "People move through predictable stages when facing a change — including not yet being sure they want it — and ambivalence about seeking help is a well-documented stage, not a sign something is wrong with you or that you're not trying.",
    body:
      "Deciding to see a therapist, start medication, or make any real change rarely happens as a single clean decision. A widely used model describes several stages: not yet considering the change, weighing it while still unsure, actively preparing, taking action, and maintaining it afterward. Feeling mixed — wanting things to be different but not fully ready to act, or taking a step (like booking an appointment) while still doubting it — fits squarely inside this normal process, not outside it. Many people find it eases the pressure to know that ambivalence isn't a stall or a failure; it's an expected stage on the way, not evidence you're not really trying.",
    basis: "Prochaska & DiClemente 1983, Journal of Consulting and Clinical Psychology, 51(3):390-395 (Transtheoretical Model / Stages of Change).",
    tags: ["seeking help", "therapy", "psychiatrist", "psychologist", "not sure", "ambivalent", "should I go", "appointment"],
  },
  {
    id: "post-traumatic-growth",
    title: "Some people report growth after hard things — not instead of pain, alongside it",
    summary:
      "Some people describe positive changes after very difficult experiences — alongside their distress, not as a replacement for it. This isn't a promise, a timeline, or a reason the hard thing happened.",
    body:
      "It can feel almost offensive to hear 'this will make you stronger' in the middle of something genuinely hard. What research on this describes is more specific and more modest: some people, after difficult or traumatic experiences, report changes like a clearer sense of what matters, closer relationships, or a felt appreciation for life — reported alongside ongoing pain, not after it resolves. This is not universal, not guaranteed, and not evidence that suffering is worth it or 'happens for a reason' — some researchers note self-reported growth may partly reflect how people make sense of hard events rather than a verified change. Many people find it more useful as a 'this can genuinely coexist' idea than as an expectation to live up to.",
    basis: "Tedeschi & Calhoun 1996, Journal of Traumatic Stress, 9(3):455-471 (Posttraumatic Growth Inventory); active debate on measurement, e.g. Boals et al. 2022 meta-analysis.",
    tags: ["growth", "meaning", "after trauma", "stronger", "silver lining", "made sense of it", "perspective"],
  },
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm test -- psychoed`
Expected: PASS — all tests in `psychoed.test.ts` and `psychoedRetrieval.test.ts` green, including the updated count/caveat assertions.

- [ ] **Step 6: Commit**

```bash
git add src/services/psychoed.ts src/services/psychoed.test.ts src/services/psychoedRetrieval.test.ts
git commit -m "feat: expand psychoeducation corpus to 44 research-cited topics"
```

---

### Task 2: Rewrite `deriveInMomentInsight` for semantic matching

**Files:**
- Modify: `src/services/inMomentInsight.ts` (full rewrite of the logic below the imports; interfaces preserved)
- Modify: `src/services/inMomentInsight.test.ts` (full rewrite for the new async signature)

**Interfaces:**
- Consumes: `embeddingSearchPsychoed(query, {limit, minScore}): Promise<PsychoedResult[]>` and `PsychoedResult { topic: PsychoedTopic; score: number }` from `src/services/psychoedRetrieval.ts:11-14,75-109`; `searchPsychoed(query): PsychoedTopic[]` and `PSYCHOED_TOPICS` from `src/services/psychoed.ts`; `suggestSkill(text): SkillSuggestion | null` from `src/services/skillSuggest.ts` (unchanged); `scanForCrisis(text): boolean` from `src/safety`; `UserState` from `src/types/modes`.
- Produces: `deriveInMomentInsight(userMessage: string, userState: UserState | null, previousExplainerId?: string | null): Promise<InMomentInsight | null>` — now **async**, with a new third parameter. `pickExplainer(ranked: PsychoedResult[], userState: UserState | null, previousExplainerId: string | null): PsychoedTopic | null` — new exported pure function, used directly by Task 3's consumers is not required, but is exported for its own unit tests. `InMomentInsight` interface (`explainer?: PsychoedTopic; skill?: SkillSuggestion`) is unchanged — `src/services/nilaSend.ts:12,22` already types `NilaUiMessage.insight` against it, no change needed there.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/services/inMomentInsight.test.ts` with:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { deriveInMomentInsight, pickExplainer } from "./inMomentInsight";
import { PSYCHOED_TOPICS } from "./psychoed";
import { setPsychoedEmbedder, resetPsychoedIndex, type PsychoedResult } from "./psychoedRetrieval";
import type { Embedder } from "./crisisClassifier";

// In-moment insight = the brief, research-cited "why you might feel this way" explainer +
// a relevant skill/tool suggestion, surfaced under Nila's reply. The explainer is matched
// semantically (on-device MiniLM embeddings) with a lexical fallback; the skill stays lexical.

function topic(id: string) {
  const t = PSYCHOED_TOPICS.find((t) => t.id === id);
  if (!t) throw new Error(`test setup: unknown topic id ${id}`);
  return t;
}

beforeEach(() => {
  resetPsychoedIndex();
});

describe("deriveInMomentInsight", () => {
  it("returns null for empty / whitespace input", async () => {
    expect(await deriveInMomentInsight("", null)).toBeNull();
    expect(await deriveInMomentInsight("   ", "calm")).toBeNull();
  });

  it("returns null for crisis text (never psychoeducate over crisis)", async () => {
    // §9: a crisis disclosure must NOT get a wellness explainer/skill card.
    expect(await deriveInMomentInsight("I want to kill myself", null)).toBeNull();
  });

  it("benign chit-chat returns null (no forced explainer)", async () => {
    expect(await deriveInMomentInsight("hey nila, good morning", "calm")).toBeNull();
  });

  it("no embedder set (cold start / test environment) falls open to lexical matching", async () => {
    // No setPsychoedEmbedder call here — mirrors ModeScreen.test.tsx and a real pre-warm cold start.
    const insight = await deriveInMomentInsight("my heart is racing and I feel panicky", "anxious");
    expect(insight).not.toBeNull();
    expect(insight!.explainer?.id).toBe("anxiety-alarm");
    expect(insight!.skill).not.toBeNull();
  });

  it("skill-only when text matches a skill but no explainer clears", async () => {
    const insight = await deriveInMomentInsight("I'm so angry and about to snap", null);
    expect(insight).not.toBeNull();
    expect(insight!.skill).not.toBeNull();
  });

  it("carries a research citation on the explainer", async () => {
    const insight = await deriveInMomentInsight("my heart is racing and I feel panicky", "anxious");
    expect(insight!.explainer?.basis).toBeTruthy();
  });

  it("no state — fallback lexical match still yields a relevant explainer", async () => {
    const insight = await deriveInMomentInsight("I keep ruminating and can't stop the spiral", null);
    expect(insight).not.toBeNull();
    expect(insight!.explainer?.id).toBe("rumination-loop");
  });

  it("repeat-avoidance is wired through from the public API", async () => {
    // Exact fallback-target selection is covered deterministically by the pickExplainer tests
    // below; here we only need to confirm the parameter is threaded through and honored.
    const insight = await deriveInMomentInsight(
      "my heart is racing and I feel panicky",
      "anxious",
      "anxiety-alarm", // pretend this was the previous turn's card
    );
    expect(insight?.explainer?.id).not.toBe("anxiety-alarm");
  });

  it("semantic matching catches a paraphrase the lexical matcher would miss", async () => {
    // "keep going over what happened" shares no tag/tokens with rumination-loop's lexical tags
    // ("rumination", "ruminating", "overthink", ...) but is semantically the same concept.
    // rumination-loop's real title is "Why the mind loops on the past" — match on that phrase.
    const paraphraseEmbedder: Embedder = async (text: string) => {
      const vec = new Array(384).fill(0);
      const lower = text.toLowerCase();
      const isRuminationCluster =
        lower.includes("keep going over what happened") || lower.includes("loops on the past");
      vec[0] = isRuminationCluster ? 1 : 0;
      vec[1] = isRuminationCluster ? 0 : 0.01;
      return vec;
    };
    setPsychoedEmbedder(paraphraseEmbedder);
    const insight = await deriveInMomentInsight("I keep going over what happened last night", null);
    expect(insight!.explainer?.id).toBe("rumination-loop");
  });

  it("REGRESSION: the reported bug — an appointment-logistics message no longer surfaces the unrelated 'daily rhythms' card", async () => {
    // Previously this exact message showed the "circadian-bipolar" card purely because
    // userState was "elevated" — the STATE_TOPIC blind fallback, now removed. This exercises
    // the lexical fallback path (no embedder set): it should surface something the message
    // actually relates to (ambivalence-seeking-help matches on "psychiatrist"/"psychologist"),
    // never the unrelated circadian card.
    const insight = await deriveInMomentInsight(
      "Today morning I consulted psychiatrist and evening I'm consulting psychologist",
      "elevated",
    );
    expect(insight?.explainer?.id).not.toBe("circadian-bipolar");
    expect(insight?.explainer?.id).toBe("ambivalence-seeking-help");
  });
});

describe("pickExplainer", () => {
  const anxiety = topic("anxiety-alarm");
  const depression = topic("depression-action");
  const circadian = topic("circadian-bipolar");
  const rumination = topic("rumination-loop");

  it("picks the top-ranked topic when there is no tie and no repeat", () => {
    const ranked: PsychoedResult[] = [
      { topic: anxiety, score: 0.6 },
      { topic: depression, score: 0.4 },
    ];
    expect(pickExplainer(ranked, null, null)?.id).toBe("anxiety-alarm");
  });

  it("returns null for an empty ranked list", () => {
    expect(pickExplainer([], "anxious", null)).toBeNull();
  });

  it("state breaks a genuine near-tie in favor of the state-aligned topic", () => {
    const ranked: PsychoedResult[] = [
      { topic: rumination, score: 0.5 },
      { topic: circadian, score: 0.48 }, // within TIE_BREAK_EPSILON (0.03) of the top score
    ];
    expect(pickExplainer(ranked, "elevated", null)?.id).toBe("circadian-bipolar");
  });

  it("state does NOT override a clear (non-tied) winner", () => {
    const ranked: PsychoedResult[] = [
      { topic: rumination, score: 0.8 },
      { topic: circadian, score: 0.4 }, // far outside the epsilon
    ];
    expect(pickExplainer(ranked, "elevated", null)?.id).toBe("rumination-loop");
  });

  it("falls through to the #2 match when #1 repeats the previous turn's card", () => {
    const ranked: PsychoedResult[] = [
      { topic: anxiety, score: 0.55 },
      { topic: depression, score: 0.5 },
    ];
    expect(pickExplainer(ranked, null, "anxiety-alarm")?.id).toBe("depression-action");
  });

  it("suppresses the card when the only match repeats the previous turn's card", () => {
    const ranked: PsychoedResult[] = [{ topic: anxiety, score: 0.55 }];
    expect(pickExplainer(ranked, null, "anxiety-alarm")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- inMomentInsight`
Expected: FAIL — compile error / test failures, since `pickExplainer` doesn't exist yet and `deriveInMomentInsight` is still synchronous.

- [ ] **Step 3: Rewrite the implementation**

Replace the full contents of `src/services/inMomentInsight.ts` with:

```ts
// In-moment insight — the brief, research-cited "why you might feel this way" explainer +
// a relevant skill/tool suggestion, surfaced under Nila's reply. The explainer is matched
// semantically (on-device MiniLM embeddings via psychoedRetrieval — the same retriever that
// already grounds Nila's own replies) with a deterministic lexical fallback if the embedder
// isn't ready. The skill stays independently lexical (suggestSkill), unchanged. Never fires
// over crisis text (§9 floor).
//
// Privacy: the insight is a UI-only artifact attached to the assistant message; it is
// stripped before any model call (buildOutgoing maps only role/content) so it never leaves
// the device and never reaches the LLM.

import { searchPsychoed, type PsychoedTopic } from "./psychoed";
import { embeddingSearchPsychoed, type PsychoedResult } from "./psychoedRetrieval";
import { suggestSkill, type SkillSuggestion } from "./skillSuggest";
import { scanForCrisis } from "../safety";
import type { UserState } from "../types/modes";

export interface InMomentInsight {
  /** Research-cited explanation — "why you might feel this way". */
  explainer?: PsychoedTopic;
  /** Suggested, evidence-based skill/tool for right now. */
  skill?: SkillSuggestion;
}

// Soft tie-breaker only (NOT a fallback): when the top two embedding matches are within
// TIE_BREAK_EPSILON of each other, prefer the topic aligned with the user's known state. A
// known state can never promote a topic that didn't clear EXPLAINER_MIN_SCORE on its own —
// that blind-fallback behavior used to show the same state-linked card regardless of what the
// user actually said (confirmed bug: an appointment-logistics message showed the
// "circadian-bipolar" card purely because the state was "elevated").
const STATE_TOPIC: Partial<Record<UserState, string>> = {
  anxious: "anxiety-alarm",
  low: "depression-action",
  elevated: "circadian-bipolar",
};

// Precision bar for showing the explainer as a standalone, asserted card — higher than
// psychoedRetrieval's own RAG_MIN_SCORE (0.25), which only gates a soft hint the chat LLM may
// silently ignore. A direct claim shown to the user needs more headroom against false matches.
const EXPLAINER_MIN_SCORE = 0.32;
const TIE_BREAK_EPSILON = 0.03;

/**
 * Decide the final explainer from a relevance-ranked list: applies the state tie-break, then
 * repeat-avoidance (never show the same card two turns in a row — falls through to the next
 * candidate that already cleared the relevance bar, or suppresses if none remain). Pure and
 * synchronous so it's directly unit-testable with hand-built score arrays.
 */
export function pickExplainer(
  ranked: PsychoedResult[],
  userState: UserState | null,
  previousExplainerId: string | null,
): PsychoedTopic | null {
  if (ranked.length === 0) return null;

  const stateId = userState ? STATE_TOPIC[userState] : undefined;
  let best = ranked[0];
  if (
    stateId &&
    ranked.length > 1 &&
    ranked[0].topic.id !== stateId &&
    ranked[1].topic.id === stateId &&
    ranked[0].score - ranked[1].score <= TIE_BREAK_EPSILON
  ) {
    best = ranked[1];
  }

  if (best.topic.id === previousExplainerId) {
    const next = ranked.find((r) => r.topic.id !== previousExplainerId);
    return next ? next.topic : null;
  }

  return best.topic;
}

/**
 * Resolve the best-matching explainer via semantic (embedding) search, with a deterministic
 * lexical fallback if the embedder isn't ready (not yet warmed at cold start, or absent in a
 * test environment — ModeScreen.test.tsx never calls setPsychoedEmbedder). The two synthetic
 * lexical scores (1 / 0.5) are spaced well outside TIE_BREAK_EPSILON so the state tie-break
 * never spuriously fires on the coarser lexical fallback path.
 */
async function resolveExplainer(
  text: string,
  userState: UserState | null,
  previousExplainerId: string | null,
): Promise<PsychoedTopic | null> {
  let ranked: PsychoedResult[];
  try {
    ranked = await embeddingSearchPsychoed(text, { limit: 2, minScore: EXPLAINER_MIN_SCORE });
  } catch {
    const lex = searchPsychoed(text).slice(0, 2);
    ranked = lex.map((t, i) => ({ topic: t, score: i === 0 ? 1 : 0.5 }));
  }
  return pickExplainer(ranked, userState, previousExplainerId);
}

/**
 * Derive the in-moment insight for a user message. Returns null when there is nothing
 * safe + relevant to show (empty, crisis, or benign chit-chat). The explainer's own relevance
 * score is its gate — independent of the skill suggestion, which keeps its own lexical gate.
 *
 * `previousExplainerId` should be the `explainer.id` shown on the immediately-previous
 * assistant turn (or null/omitted for the first turn) so repeat-avoidance can apply.
 */
export async function deriveInMomentInsight(
  userMessage: string,
  userState: UserState | null,
  previousExplainerId: string | null = null,
): Promise<InMomentInsight | null> {
  const text = (userMessage || "").trim();
  if (!text || scanForCrisis(text)) return null; // §9: never psychoeducate over crisis

  const insight: InMomentInsight = {};

  const skill = suggestSkill(text);
  if (skill) insight.skill = skill;

  const explainer = await resolveExplainer(text, userState, previousExplainerId);
  if (explainer) insight.explainer = explainer;

  return insight.explainer || insight.skill ? insight : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- inMomentInsight`
Expected: PASS — all tests in `inMomentInsight.test.ts` green.

- [ ] **Step 5: Run the full suite to check for regressions elsewhere**

Run: `npm test`
Expected: PASS. If `ModeScreen.test.tsx` fails on a timing assertion (asserting on `messages` state immediately after firing a send event, without awaiting), that's a pre-existing test relying on synchronous insight resolution — wrap the failing assertion in `waitFor` (already used elsewhere in that file for the also-async `sendToNila` resolution) rather than changing production code.

- [ ] **Step 6: Commit**

```bash
git add src/services/inMomentInsight.ts src/services/inMomentInsight.test.ts
git commit -m "feat: semantic matching for the in-moment insight explainer

Replaces keyword-overlap matching and the blind per-state fallback with
the existing on-device MiniLM embedding retriever, adds a state tie-break
and turn-to-turn repeat-avoidance, and fails open to lexical matching when
the embedder isn't ready."
```

---

### Task 3: Wire the async call into ModeScreen's send handler

**Files:**
- Modify: `src/components/ModeScreen.tsx:424` (the `deriveInMomentInsight` call site, inside the async send handler)

**Interfaces:**
- Consumes: `deriveInMomentInsight(userMessage, userState, previousExplainerId?): Promise<InMomentInsight | null>` from Task 2; `NilaUiMessage.insight?.explainer?.id` (unchanged shape, `src/services/nilaSend.ts:16-23`); the component's own `messages` state (`NilaUiMessage[]`) and `msg` (raw string, the send handler's parameter).
- Produces: nothing new consumed elsewhere — this is the final call site.

- [ ] **Step 1: Update the call site**

In `src/components/ModeScreen.tsx`, replace line 424:

```ts
      const insight = deriveInMomentInsight(msg, mode.userState);
```

with:

```ts
      const previousExplainerId =
        [...messages].reverse().find((m) => m.role === "assistant")?.insight?.explainer?.id ?? null;
      const insight = await deriveInMomentInsight(msg, mode.userState, previousExplainerId);
```

This is a minimal change: the handler already `await`s `sendToNila(...)` a few lines above (line 388) inside the same `try` block, so adding one more `await` here follows the existing pattern. `messages` is the pre-turn closure state (it does not yet include this turn's user message — confirmed by the existing `allMessages = [...messages, userMsg]` reconstruction a few lines above at line 387), so the last assistant entry in it is exactly the previous turn's card. Everything below this line (`insight ?? undefined` on line 426, `insight?.skill?.skill` on line 454) already consumes a resolved value and needs no further change, since `insight` is now the awaited result rather than a promise.

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS — no TypeScript errors. (`msg`, `messages`, and `mode.userState` are all already in scope at this point in the handler; `deriveInMomentInsight`'s new third parameter is optional with a default, so this call site — and any other caller — remains valid without it.)

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests green, including `ModeScreen.test.tsx`.

- [ ] **Step 4: Manual on-device-adjacent sanity check**

Start the dev server and drive a couple of real chat turns to confirm the card behaves as intended before this ships — the assertions above cover logic, not the on-device MiniLM's real embedding quality against the actual `EXPLAINER_MIN_SCORE = 0.32` threshold, which can only be judged by trying real messages against the real model.

Run: `npm run dev`, open the app, and in the companion chat:
1. Send a message that clearly matches one of the new topics in a way that pure keyword matching would have missed (e.g. "I keep telling myself I should've done better even though it went fine" — should surface `perfectionism-clinical` or a closely related card, not nothing).
2. Send the same message again — confirm the card either changes to a different relevant topic or disappears, but does not repeat the exact same card.
3. Send an unrelated logistics message (e.g. "I have two appointments today") — confirm no wildly irrelevant card appears (this is the original reported bug's scenario).

If `EXPLAINER_MIN_SCORE` looks too strict (relevant cards never appear) or too loose (irrelevant cards appear) against the real model, adjust the constant in `src/services/inMomentInsight.ts` and re-run Task 2's `pickExplainer` tests (unaffected by the threshold, since they operate on hand-built scores) plus this manual check — no other code changes needed for a threshold tune.

- [ ] **Step 5: Commit**

```bash
git add src/components/ModeScreen.tsx
git commit -m "feat: await semantic in-moment insight resolution and thread repeat-avoidance"
```

- [ ] **Step 6: Version bump and tag** (per project convention — gated on lint + full suite green, matches Global Constraints)

Follow the project's existing release process (bump `versionName`/`versionCode` per its usual convention, confirm `npm run lint && npm test` both pass, commit the version bump, then tag):

```bash
npm run lint && npm test
git add -A
git commit -m "chore: bump version for in-moment insight semantic redesign release"
git tag -a vX.Y.Z -m "In-moment insight: semantic matching + expanded corpus"
```

(Substitute the actual next `vX.Y.Z` matching the bumped `versionName` — check the current value before bumping.)

---

## Self-Review Notes

- **Spec coverage:** Matching engine (Task 2), repeat-avoidance (Task 2, `pickExplainer`), latency/call-site handling — simplified from the spec's "render now, patch later" to a single inline `await` (Task 3; the extra ~100-300ms is judged not worth the added complexity of message-id-based patching given there's no existing id field on `NilaUiMessage` — flagged here as a deliberate, minor deviation from the spec's exact wording, not from its intent), library expansion (Task 1, all 22 topics with verified citations), citation verification (done during plan-writing via a dedicated research pass — see the hedged citations for `fawn-response-appeasement`, `decision-fatigue`, `life-transitions`, and `post-traumatic-growth`, each framed honestly rather than overclaimed), testing (Tasks 1 & 2), rollout (Task 3 Steps 4-6). Body-image/eating topics correctly excluded (not present anywhere in Task 1).
- **Placeholder scan:** No TBDs; every step has literal code/commands.
- **Type consistency:** `PsychoedResult { topic: PsychoedTopic; score: number }` used identically across Task 2's implementation and tests. `deriveInMomentInsight`'s new third parameter (`previousExplainerId?: string | null`) is optional-with-default, so Task 3's call site (which now always passes it) and any other hypothetical caller (which wouldn't need to) both type-check.
