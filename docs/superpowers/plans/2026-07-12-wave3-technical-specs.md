# Wave 3 Technical Specs — 2026-07-12

Extracted from 6 research-agent reports (read-only research, no files edited by the research agents). Source: `/private/tmp/claude-501/-Users-sujithsampath/5103afda-8fd6-4665-9b1e-9738b0b815f9/tasks/wkhhuk09h.output`.

---

## 1. Sleep Regularity Index (SRI)

**FEASIBILITY FLAG: the literal formula cannot be computed from current NilaMind data. A specific, literature-faithful approximation is required — see §5 below. This changes the scope of "add SRI" from a formula port to a data-plumbing change.**

### Exact formula (Phillips et al. 2017, *Scientific Reports* 7:3216)

```
SRI = -100 + 200/(M·(N-1)) · Σ_{j=1}^{M} Σ_{i=1}^{N-1} δ(s_{i,j}, s_{i+1,j})
```

- `N` = number of days recorded.
- `M` = number of daily epochs (original paper: 1-minute epochs, M=1440; GGIR uses 30-second epochs aggregated).
- `s_{i,j}` = binary sleep/wake state, day *i*, epoch *j* (coding direction arbitrary/symmetric).
- `δ` = Kronecker delta = 1 if state at epoch *j* matches the same clock-time epoch 24h later, else 0.
- Range: theoretical −100 to +100; negative scores "very unlikely" in practice. Real-world scores cluster ~0–100 (UK Biobank median 81, IQR 73.8–86.3, Windred et al. 2024).
- **Founding-paper data type**: derived from daily sleep diaries (self-report bed/wake times), not actigraphy — ~30 days logged, computed over "the longest interval of a whole number of weeks with no missing data" (1–4 weeks used per participant). This detail is load-bearing for the recommended approximation below.

### Minimum data window

- Original Phillips 2017: strict contiguous whole-number-of-weeks block (7/14/21/28 days), zero missing data; shortest usable block in their dataset was 7 days.
- **Field-standard practical minimum (Windred et al. 2024, `sleepreg` package)**: ≥120 hours of 24h-separated epoch pairs, i.e. **≥5 valid days**, gap-tolerant.
- GGIR additionally excludes day-pairs with <66% valid-epoch coverage rather than requiring one perfect block — this gap-tolerant, day-pair-level approach is what current papers (incl. Li 2025 below) actually use.
- **Recommendation for NilaMind**: ≥7 nights minimum (matches existing `MIN_NIGHTS=7`/`MIN_RHYTHM_DAYS=5` conventions already in the codebase), gap-tolerant (sum only over available consecutive-day pairs).

### Risk-strata → hazard-ratio mapping (Li et al. 2025, *Psychological Medicine*, PMID 40814280, UK Biobank N=79,666, 7-day accelerometer + GGIR, median 7.5yr follow-up)

Quintile-derived cut-points:
- **Irregular**: SRI ≤ 51 (reference group)
- **Moderately irregular**: SRI 52–70
- **Regular**: SRI ≥ 71

Hazard ratios vs. irregular referent:
- **Depression**: moderately irregular HR 0.80 (95% CI 0.71–0.90); regular HR **0.62** (95% CI 0.52–0.73) — 38% lower risk.
- **Anxiety**: moderately irregular HR 0.82 (95% CI 0.74–0.91); regular HR **0.67** (95% CI 0.58–0.77) — 33% lower risk.
- Combined irregular-sleep + non-recommended-duration = highest risk (depression HR 1.91, anxiety HR 1.61 vs. regular+recommended-duration reference) — paper explicitly treats timing regularity and duration adherence as **separable risk dimensions**.

### Current NilaMind implementation — confirmed NOT real SRI

`src/services/circadianFeedback.ts` computes `combinedScore` as an average of two proxies, neither of which is timing-based per-epoch state:
- `sleepRegularityScore(sleeps: number[])` — coefficient-of-variation of nightly **total sleep duration** (no clock time).
- `rhythmRegularityScore(variabilityMin)` — linear map of circular SD of clock-times from the Social Rhythm Metric.

Call sites: `DashboardScreen.tsx:109`, `SocialRhythmScreen.tsx:55`, `YourDataScreen.tsx:492`, `nilaContext.ts:269`. All four trace to `sleeps` populated exclusively from `loadMoodHistory()`'s `sleepHours` field — one self-reported duration float/day (`src/services/moodHistory.ts:36-45`, `CheckInEntry.sleepHours`). **No bedtime/wake-time pair and no per-epoch state exist anywhere in this path today.**

**Data audit — what actually exists:**
1. **Mood check-in `sleepHours`** (`moodHistory.ts`) — duration only, one float/day.
2. **Health Connect** (`src/services/healthConnect.ts`) — raw plugin `readSleep()` returns `sessions: Array<{startTime, endTime}>` (actual ISO bedtime/wake timestamps) — but `mapSleepSessions()` (**lines 47-58**) immediately collapses each session to `{date, hours}`, discarding the timestamps. Off-by-default; requires a COROS wearable via Health Connect.
3. **Social Rhythm Metric** (`src/services/socialRhythm.ts`) — self-logged HH:MM clock times for 5 anchors including explicit "wake" and "bed" (`RHYTHM_ANCHORS`), with a circular-mean/circular-SD helper (`circularStats`) already built. Reaches `circadianFeedback.ts` only as one aggregated SD-in-minutes number (`overallVariabilityMin`), never as raw bed/wake pairs.

**Verdict**: no per-time-bin sleep/wake state exists or is planned (Health Connect is deliberately locked to "duration/timing only, never stage" per the plan doc). A literal Phillips-formula implementation is not possible today. The current `combinedScore` measures duration variability, which the SRI literature (Li 2025, Windred 2024) treats as a different, only loosely correlated construct from timing regularity — e.g. someone sleeping a rock-steady 7.5h/night but shifting bedtime 3h night-to-night scores perfectly today but very poorly on true SRI.

### Recommended real-SRI-faithful approximation

The two available-but-unused sources — Health Connect's discarded session timestamps, and Social Rhythm's bed/wake anchors — together give exactly the input class the **original 2017 paper itself used** (diary-based bedtime + wake-time pairs, not actigraphy). This is not a lesser approximation; it's methodologically the same input type as the founding study. The only capability it lacks vs. modern GGIR/`sleepreg` accelerometer versions is detecting wake-bouts/fragmentation *within* a sleep episode.

Implementation path:
1. **Stop discarding timestamps in `mapSleepSessions()`** (`healthConnect.ts:47-58`) — retain sleep-onset/offset clock-times per night when Health Connect is enabled.
2. **Reuse Social Rhythm's `bed`/`wake` anchors** as a second, always-available manual source of the same two boundary times, using existing midnight-wraparound-safe `parseTime`/circular-math in `socialRhythm.ts`.
3. **Reconstruct a per-day binary state vector** (1-minute epochs to match Phillips exactly, or 5/10-min bins for simplicity — resolution only matters at the two edges since the asleep state is one contiguous block between bedtime and wake-time, handling midnight wrap).
4. **Run the exact Phillips formula** on the reconstructed grid — genuine, literature-faithful, not a heuristic.
5. **Gate on ≥7 nights**, gap-tolerant (Windred/`sleepreg`-style), not the original paper's stricter contiguous-whole-week rule.
6. **Keep duration-CV as a separate, clearly-labeled metric** ("sleep duration consistency") rather than folding it back into SRI — averaging the two (current behavior) just reproduces the conflation under a new name.
7. **Caveat the risk-strata reuse honestly**: SRI≥71/≤51 cut-points come from a 7-day wrist-accelerometer + GGIR pipeline on UK Biobank. A two-point-per-day, possibly self-logged reconstruction has different measurement-error properties. Present strata as an evidence-informed directional band ("research on objectively-measured sleep regularity links scores in this range to roughly X% lower depression/anxiety risk"), not diagnostic-grade equivalence.

**Files**: `src/services/circadianFeedback.ts` (placeholder to replace), `src/services/healthConnect.ts:47-58` (timestamp-discarding point), `src/services/socialRhythm.ts` (bed/wake anchors + circular-time math to reuse), `src/services/circadian.ts` and `src/services/sleepHoursVariability.ts` (existing duration-CV logic to keep separate).

---

## 2. Intolerance-of-Uncertainty (IU) protocol

**CITATION FLAG: the plan doc's attribution ("modeled on Dugas et al. 2022, *Behavior Therapy*") is wrong.** Dugas et al. (2022) is a real paper but is a 12-week clinician-delivered behavioral-experiments RCT for full-syndrome GAD — it shares zero structural/citation overlap with the actual single-session intervention this protocol should be based on, and never appears in that paper's reference list. The correct basis is **Daniels, Hasan & Schweizer (2025), *Psychological Medicine* 55, e377** (N=259 RCT, self-guided single-session online "Uncertainty-Mindset Training" vs. psychoeducation + no-training controls), built on Schleider et al.'s (2020) BEST framework and Yeager et al.'s (2022, *Nature*) synergistic-mindsets model. IU theory itself traces to the classic Dugas/Freeston/Ladouceur line (Freeston et al. 1994; Ladouceur, Gosselin & Dugas 2000; Buhr & Dugas 2002; Dugas et al. 2005) — do not compress the 12-session Dugas 2022 protocol into one sitting.

**Effect sizes** (mindset-training arm only): IU d=1.28 immediate post-training, d=0.86 at 1-month; anxiety (GAD-7) d=0.50 at 1-month; depression (PHQ-8) d=0.60 at 1-month; IU reduction partially mediates the MH gains. No functional-impairment advantage over controls (known SSI limitation, flag honestly).

### `protocols.ts` shape to follow

```ts
export interface Protocol {
  id: string;
  title: string;
  basis: string;              // mandatory evidence string
  forConcerns: string[];      // lexical routing cues, lowercase
  steps: ProtocolStep[];      // ProtocolStep: { id, title, kind, prompt }
}
```
`kind` ∈ `"psychoed" | "reflect" | "plan" | "exercise"`. Step ids use short prefix + sequence number. `prompt` always Nila's first-person voice ("an invitation, never a lecture"). Registered in `PROTOCOLS` array, picked up by `routeToProtocol()`'s lexical scorer against `forConcerns`.

### 7-step draft protocol (`id: "intolerance-of-uncertainty"`, title "Making Peace with Uncertainty")

1. **iu-1 — "How this works" (psychoed).** *Purpose:* orient + set expectations. *Content:* single ~15-min sitting, no return visit/daily practice; brief neuroplasticity framing (how we relate to uncertainty is learnable, not fixed). *Citation:* Schleider et al. (2020) BEST framework's "Brain science" component; Schleider & Weisz (2017) meta-analysis (single-session, no-homework format is itself evidence-matched — 99% attrition on multisession digital tools, Zhou et al. 2021).

2. **iu-2 — "Uncertainty isn't the threat it feels like" (psychoed).** *Purpose:* deliver Component 1 (uncertainty-as-adaptive mindset) + testimonial beat. *Content:* reframe uncertainty from "inherently dangerous" to "the normal cost of anything new or meaningful," paired with a short testimonial example. *Citation:* Daniels, Hasan & Schweizer (2025) Component 1; Reuman et al. (2015); Padilla, Mishel & Grant (1992); precedent effect Shapiro et al. (2023).

3. **iu-3 — "Your own evidence" (reflect).** *Purpose:* saying-is-believing + empowered-as-helper mechanism — converts passive reading into internalized belief. *Content:* ask for a real time uncertainty led somewhere okay/good, then what they'd tell a friend facing the same uncertainty. *Citation:* BEST framework's "Saying-is-believing" + "Empowering youth as helpers," Schleider et al. (2020) — named explicitly as the operative mechanism in the source paper's Methods.

4. **iu-4 — "Tolerance is a skill, not a trait" (psychoed).** *Purpose:* deliver Component 2 (growth mindset), sequenced immediately after Component 1 to reproduce the "synergistic" pairing driving the trial's effect-size advantage. *Content:* coping-with-uncertainty capacity strengthens with use, like a muscle, not fixed trait. *Citation:* Yeager et al. (2022, *Nature*, synergistic mindsets); Dweck & Yeager (2019); Schleider & Weisz (2018).

5. **iu-5 — "Learn STAR" (exercise).** *Purpose:* deliver Component 3 (RNT cessation) as a teachable micro-skill. *Content:* STop (notice the spiral starting) → Accept (let uncertainty be there without fighting it) → Re-think (swap catastrophic "what if" for a workable next thought). *Citation:* Daniels, Hasan & Schweizer (2025) Component 3 — **STAR acronym flagged lower-confidence**, sourced from a UNSW Sydney press release quoting the authors, not present in the peer-reviewed manuscript text itself; verify literal wording against OSF supplementary materials (https://osf.io/fztqr) before treating as verbatim. Underlying RNT-cessation rationale solid regardless (Buhr & Dugas 2002; Ladouceur, Gosselin & Dugas 2000; Dar, Iqbal & Mushtaq 2017).

6. **iu-6 — "Try STAR on something real" (exercise).** *Purpose:* behavioral rehearsal on a live worry, not hypothetical. *Content:* ask for one active uncertainty-driven worry, walk it through Stop/Accept/Re-think live. *Citation:* general SSI "action plan" component (Schleider & Weisz literature); matches app's existing pattern of pairing taught skills with immediate in-session use (`pa-4`, `sc-3`/`sc-4`).

7. **iu-7 — "One line to carry with you" (plan).** *Purpose:* single actionable takeaway + explicit close — deliberately does NOT schedule a follow-up (honors SSI "no homework" design). *Content:* compress what shifted into one recallable line; close without scheduling anything further. *Citation:* Schleider & Weisz (2017) SSI efficacy without multi-session structure. **Explicit warning: unlike BA/DBT (flagged elsewhere as wrongly one-pass when evidence is multi-week), this protocol's evidence IS single-pass — do not loop it into a recurring cadence, that would be un-evidenced scope creep in the opposite direction.**

Suggested `forConcerns` lexical cues: "uncertain", "uncertainty", "don't know what's going to happen", "hate not knowing", "can't stand not knowing", "no control over what happens", "everything feels uncertain", "future is uncertain", "unpredictable", "unknown", "ambiguous", "ambiguity", "need certainty", "what if it goes wrong", "fear of the unknown".

**Files**: `src/services/protocols.ts` (360 lines, target file; `worry-postponement`/`wp-*` is the closest existing model to follow). Note: `activeProtocolContext.test.ts` and `protocolProgress.test.ts` hardcode some protocols' step counts (BA=5, WP=5) — `intolerance-of-uncertainty` is a fresh id with no existing hardcode, but be aware future tests may start relying on the count once shipped.

---

## 3. TIPP tool design

### 4 components: evidence + safety cautions

**T — Temperature (cold water/ice).** *Mechanism:* face immersion triggers the mammalian dive reflex (trigeminal nerve → brainstem → increased cardiac vagal efferent activity → bradycardia + peripheral vasoconstriction). Ackermann et al. (2023, *Psychophysiology*) meta-analysis confirms moderate-to-large effect on cardiac vagal activity. *Protocol fidelity:* water below ~50–60°F (10–15°C), held 30–60s. *Safety — needs an explicit gate, not a footnote:* the same reflex implicated in "autonomic conflict" arrhythmia risk (Shattock & Tipton 2012). **Contraindicated or requires sign-off for:** known cardiac arrhythmia, pacemaker, uncontrolled hypertension, beta-blockers/HR-affecting medication, seizure disorder, and — specifically relevant to a MH app — eating disorders with bradycardia/electrolyte-imbalance/low-cardiac-mass history. Softer cautions: cold sensitivity/Raynaud's, pregnancy.

**I — Intense exercise.** *Mechanism:* acute aerobic exercise reduces state anxiety/physiological arousal (Petruzzello et al. 1991 meta-analysis; Bernstein & McNally 2018 — single bout improves subsequent emotion-regulation, speeds stressor recovery; Ensari et al. meta-analysis of 36 RCTs — smaller but significant effect, cite for calibrated expectations). *Dose:* brief/vigorous (jumping jacks, running in place, stair climbing), ~30–60s to a couple minutes — discharge the sympathetic surge, not a cardio session. *Safety:* general contraindications (recent injury, cardiac condition, pregnancy) — lighter caution than Temperature but same at-risk cardiac/ED population note.

**P — Paced breathing (already built).** *Mechanism:* longer exhale than inhale biases toward vagal/parasympathetic dominance via respiratory sinus arrhythmia (already cited in codebase: Thayer & Lane 2009; Goessl, Curtiss & Hofmann 2017, g=0.81–0.83; Lehrer & Gevirtz 2014; Balban et al. 2023; You et al. 2021). TIPP's own instruction is a 1:2 exhale:inhale ratio — the app's existing `cyclicSighing` preset (inhale 3s/exhale 6s ≈ 1:2) is the closest match and already documented as prioritized for the highest-intensity/acute-episode path. **No new breath pattern needed.**

**P — Paired muscle relaxation (PMR).** *Origin:* Jacobson (1938) — tense-then-release cycling through muscle groups, paired with breath (tense on inhale, release on exhale) in DBT's adaptation. *Evidence:* Manzoni et al. (2008, *BMC Psychiatry*) 10-yr meta-analysis — largest within-group effect size (d≈0.57–0.68) among relaxation techniques, outperforming meditation; Toussaint et al. (2021) reconfirms. *Safety:* essentially universal; only caution is muscle/joint injury — "skip a group if it hurts."

**Honesty gap to carry into UI copy:** no RCT isolates a single TIPP subskill's standalone contribution as a crisis intervention (no dismantling trial). What exists is strong per-component general-psychophysiology evidence plus whole-module DBT evidence (Neacsiu, Rizvi & Linehan 2010; Linehan et al. 2015, *JAMA Psychiatry*). Match the app's existing honesty pattern (`data.ts`'s 5-4-3-2-1 entry, `skillsLibrary.ts`'s Wise Mind entry) — say the same about each TIPP subskill.

### Current implementation — 3 shallow, divergent half-versions (confirmed)

1. `src/data.ts:115` — `GROUNDING_EXERCISES`'s `"Cold Reset (TIPP)"` entry is a single static paragraph. `GroundingLibraryScreen.tsx` special-cases only `"Box Breathing"` (line 31, `isBoxBreathing`) for `<BreathingTimer />` — every other card including TIPP gets plain text, no timer.
2. `src/services/skillsLibrary.ts:44` — `tipp` entry in `SKILLS[]` has a 4-item `steps: string[]`. `SkillsLibraryScreen.tsx`'s `SkillCard` (line 165+) renders as an expandable static list — same shallow pattern.
3. `src/components/EpisodeSupportScreen.tsx:556-632` — most developed: offline-fallback branch (`guidedStep: "extreme_tipp_1"|"extreme_tipp_2"|"extreme_tipp_3"`) walks T→I→P as sequential static-text cards with intensity recheck. **No timer/countdown, no exercise counter, no breathing animation, and completely omits the fourth component (Paired muscle relaxation)** — goes straight from paced-breathing text to the intensity check. Only reachable as offline fallback inside Episode Support.

Fourth, lighter mention: `src/services/protocolDBT.ts:48-53` (one psychoeducation paragraph, not interactive, not in scope but keep terminology consistent).

### Reusable infrastructure

`src/services/breathPacer.ts` — pure DOM-free phase-cursor state machine (`phases()` builds ordered `[phase, durationMs][]`, `breathState()` maps elapsed time to current phase+progress, `cycleProgress()` gives 0–1 for a ring). `src/components/BreathingTimer.tsx` consumes it with `requestAnimationFrame`, animated SVG ring, pattern-picker chips, soft session-target cue. This exact shape is directly reusable for **Temperature** and **Intense exercise** (single-phase countdowns, trivial subset) and structurally clonable for **Paired muscle relaxation** (tense/release phase-cursor over N muscle groups — same `phases()`/state-shape).

### Concrete design: one flow, four sub-screens, shared engine

One `TIPPTool` component (not four disconnected screens) — DBT guidance is "use whichever piece fits," so let users jump to any letter rather than force linear order (also naturally handles the safety gate: someone flagged off Temperature just starts on I/P/P).

- **Entry/safety layer** (new, persisted via `secureLocal`): one-time checklist — cardiac arrhythmia/pacemaker, uncontrolled hypertension, beta-blockers/HR meds, seizure disorder, ED with bradycardia history, pregnancy, cold sensitivity. Checking any box doesn't block the tool — removes the Temperature tab, defaults flow to I→P→P with "cold water skipped for your safety — try one of these instead."
- **Nav**: 4-tab strip T·I·P·P, reusing `BreathingTimer.tsx`'s pattern-picker chip row (lines 91–104), checkmark once tried (mirrors `sessionTargetReached`'s `CheckCircle2`).
- **T**: new shared `<CountdownRing>` primitive (generalized from `BreathingTimer`'s SVG shell, taking `durationMs`/`label`/`color`), 30–60s, alternatives text (face immersion/ice pack/cold shower), cardiac caution inline. Ends in 1–10 intensity recheck (reuse `EpisodeSupportScreen.tsx` lines 466–476/532–550 intensity-grid pattern).
- **I**: same `<CountdownRing>`, 60–90s, suggested activities, recheck.
- **P (breathing)**: mount existing `<BreathingTimer />` unmodified, defaulted `pattern="cyclicSighing"` — zero new breathing code.
- **P (PMR)**: new `pmrPacer.ts` (same `phases()`/state-cursor shape as `breathPacer.ts`), tense(~5s)/release(~10s) through abbreviated muscle-group set (hands & forearms → biceps → shoulders & neck → face → abdomen → legs & feet), paired with breath (tense on inhale, release on exhale). New `PMRTimer.tsx` = near-structural-clone of `BreathingTimer.tsx`.
- **Wiring/consolidation**: point skillId `"tipp"` and the `"Cold Reset (TIPP)"` grounding card at this one `TIPPTool`; replace `EpisodeSupportScreen`'s `extreme_tipp_1/2/3` branch with a mount of the same component (passing tracked intensity down) — collapses 3 divergent half-implementations into one, closes the gap where crisis-mode currently skips Paired muscle relaxation entirely. Completed sub-skills log into existing `skillsUsed`/`ALL_DIARY_DBT_SKILLS` diary plumbing (already includes `"TIPP"`) — no new persistence work needed.

---

## 4. Two-tier crisis surface design

### Research grounding

- **PLOS Medicine (2025)** meta-analysis (53 studies): in-sample PPV 6–17%, collapsing to 0.06–0.10% at realistic population prevalence; 91–95% specificity but only 45–82% sensitivity. Conclusion: not fit as a screening/gatekeeping tool — argues for needs-based response over hard triage.
- **Frontiers in Psychology (2023)**, Norwegian adolescents: false positives attempted suicide at **2.96×–7.22× the rate of true negatives**. Recommendation: "false positives" are a truly at-risk group to include in prevention programs, not noise to suppress.
- Together: **soften the interruption, never the substance.** A probabilistic hit shouldn't get a full-screen interrupt (most flags wrong, alert fatigue real) but must still be taken seriously (false positives often real future risk).
- CDS alert-fatigue literature: standard mitigation is severity-tiered alerts (interruptive for high-confidence, non-interruptive for lower-confidence).
- BlueIce precedent (published adolescent self-harm app): low-friction **direct routing to a crisis number without multi-tap escalation** — basis for putting a live crisis-line tap directly on the soft card.

### `detectCrisis()` new return shape — additive, not a rename

```ts
// crisisClassifier.ts
export type CrisisSource = "keyword" | "classifier" | null;
export interface CrisisSignal {
  hit: boolean;
  source: CrisisSource;
}

export async function detectCrisisSignal(text: string): Promise<CrisisSignal> {
  if (scanForCrisis(text)) return { hit: true, source: "keyword" };
  if (!_enabled || !_embedder) return { hit: false, source: null };
  if (isBenignMedicationAdherence(text)) return { hit: false, source: null };
  if (isBenignHyperbole(text)) return { hit: false, source: null };
  if (isBenignExhaustion(text)) return { hit: false, source: null };
  if (isBenignOkayReassurance(text)) return { hit: false, source: null };
  const p = await scoreCrisis(text);
  return p !== null && p >= CRISIS_THRESHOLD ? { hit: true, source: "classifier" } : { hit: false, source: null };
}

// Back-compat — every existing caller unchanged, byte-for-byte same behavior
export async function detectCrisis(text: string): Promise<boolean> {
  return (await detectCrisisSignal(text)).hit;
}
```

The 10 existing `detectCrisis(...)` call sites (`EpisodeSupportScreen.tsx` ×2, `ReachOutScreen.tsx`, `reachOut.ts`, `asyncReflection.ts`, `coachAssist.ts` ×3, `windDown.ts`) require **zero changes**.

### Exact call sites to change

Only the path rendering the full-screen `CrisisOverlay` needs tier-awareness: companion chat send path (`ModeScreen.tsx` → `sendToNila.ts` → `nilaSend.ts`). Everything else is unchanged.

1. **`src/services/nilaSend.ts`** (line ~39) — add signal-returning export alongside the boolean one, keep `shouldBlockForCrisisAsync` (still used by `sendToNila`/`ModeScreen` arm-request branch):
```ts
export function crisisSignalForSend(text: string): Promise<CrisisSignal> {
  return detectCrisisSignal(text);
}
```

2. **`src/services/sendToNila.ts`** (lines 33–39, 65–69) — thread source through result:
```ts
export interface NilaSendResult {
  reply: string;
  reachedAI: boolean;
  blocked?: boolean;
  crisisSource?: "keyword" | "classifier"; // NEW — only set when blocked===true
  navigate?: AgentView;
  openSkillId?: string;
}
// ...
const crisisSignal = await crisisSignalForSend(userText);
if (crisisSignal.hit) {
  return { reply: getCrisisReply(), reachedAI: false, blocked: true, crisisSource: crisisSignal.source ?? "keyword" };
}
```
Note the `?? "keyword"` fallback: if `hit` is ever `true` with `source: null`, default to the more severe tier. Fail-closed on ambiguity.

3. **`src/components/ModeScreen.tsx`**:
   - `openCrisis` (line 102) gets a second parameter:
   ```ts
   const openCrisis = (detected = false, source: "keyword" | "classifier" | null = null) => {
     if (detected) {
       hadCrisisRef.current = true;      // UNCHANGED for both tiers
       clearSessionChat();               // UNCHANGED for both tiers
       setSkillOffer(null);              // UNCHANGED for both tiers
       setProtocolCard(null);            // UNCHANGED for both tiers
       void suppressNudgesForCrisis();   // UNCHANGED for both tiers
     }
     setPactNotice(null);
     setWelcomeBack(null);
     if (detected && source === "classifier") {
       setSoftCrisisCard(true);          // NEW — inline card, no full takeover
       return;
     }
     onOpenCrisis?.();                   // keyword hit, proactive tap, user-escalated — UNCHANGED
   };
   ```
   (import `suppressNudgesForCrisis` from `../services/notifications`, same function `App.tsx` already calls in `activateCrisis`.)
   - `handleSendMessage`'s `result.blocked` branch (line 302): `openCrisis(true, result.crisisSource ?? "keyword")` — ambiguous defaults to full takeover.
   - Arm-request branch (line 266) is a secondary call site worth the same treatment for consistency but is lower-traffic/out of primary scope. **Flagged, not prescribed**: as written it currently calls `openCrisis(true)` with no source, which under the new signature means `source=null` → falls through to full takeover — i.e. it fails closed to today's exact behavior even with zero edits. Safe to leave as a follow-up.
   - **`src/App.tsx`**: no changes needed. `activateCrisis`/`onOpenCrisis` keep meaning exactly one thing.
   - **`src/components/CrisisOverlay.tsx`**: no changes — it has no concept of confidence and shouldn't.

### Soft-card UI (`src/components/SoftCrisisCard.tsx`, new)

```tsx
<div className="w-full px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-sm space-y-3" id="soft-crisis-card">
  <div className="flex items-start gap-2">
    <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
    <div className="flex-1 space-y-1">
      <p className="font-semibold text-amber-100">Can I pause here for a second?</p>
      <p className="text-amber-200/80 leading-relaxed">
        Something in what you just said sounds heavy. I'm not fully certain — so I don't want to jump
        to conclusions — but I also don't want to just move past it. How are you doing, really?
      </p>
    </div>
  </div>
  <CrisisLines tone="amber" compact />
  <div className="flex gap-2">
    <button onClick={onEscalate} className="flex-1 py-2.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 text-xs font-bold">
      I could use support right now
    </button>
    <button onClick={onDismiss} className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs">
      I'm okay, keep going
    </button>
  </div>
</div>
```

Reuses the existing `CrisisLines` component with `tone="amber"` (already built, currently unused for crisis-specific copy). Design rationale:
- No red/full-bleed header/modal/scroll-lock — the "less interruptive" tier CDS literature prescribes for lower-confidence flags; renders inline above the input bar (same slot as existing safety-plan-review/sleep-prodrome/pact cards).
- Live tappable crisis-line number on the card itself (not gated behind escalate) — mirrors BlueIce low-friction routing.
- Copy honest about uncertainty ("I'm not fully certain") — calibrated, non-overclaiming register matching the app's existing citation-honesty discipline.
- Escalate button calls `onOpenCrisis?.()` directly — one tap to full `CrisisOverlay`.
- Dismiss clears `softCrisisCard` state only — does **not** un-latch `hadCrisisRef` or restore the wiped transcript (one-way door, same as today's keyword-hit behavior).

### Explicit confirmation: keyword-floor path is unchanged

- `scanForCrisis(text)` is checked first, unconditionally, in both `detectCrisisSignal` and untouched `detectCrisis` — identical to today's `if (scanForCrisis(text)) return true;` (`crisisClassifier.ts:85`), now also tagging `source: "keyword"`.
- Every `?? "keyword"` fallback defaults to full-takeover whenever source is missing — new code can only make a hit *more* severe on ambiguity, never less.
- `openCrisis(true, "keyword")` and `openCrisis(true, null)` both fall through to the existing `onOpenCrisis?.()` — bit-for-bit the same `CrisisOverlay` open as today.
- Substance-level safety invariants (`hadCrisisRef.current = true`, `clearSessionChat()`, `setSkillOffer(null)`, `setProtocolCard(null)`, `suppressNudgesForCrisis()`) are unconditional on `detected===true`, **not gated by source** — a classifier-only hit gets the identical never-persist/no-competing-offer/no-mid-crisis-nudge protection as a keyword hit. Only the **rendering surface** (modal vs. inline card) differs.
- All 9 other `detectCrisis(...)` callers outside the companion-chat send path are untouched — their existing (already non-modal, inline) crisis surfaces are unaffected.

---

## 5. Feedback data + Values migration

### Thumbs-up/down feedback: real, working, stored — read only by one aggregate counter

**Wiring**: `src/components/ModeScreen.tsx:658-683`, rendered per assistant message. Thumbs-up (line 660-670, `aria-label="Mark as helpful"` line 667) → `onClick` (661-665) calls `recordFeedback(m.content, "up")` (line 662). Thumbs-down (671-681, `aria-label="Mark as not helpful"` line 678) → `recordFeedback(m.content, "down")` (line 673). `recordFeedback` imported at `ModeScreen.tsx:52` from `../services/nilaFeedback`.

**Storage — real, not a no-op**. `src/services/nilaFeedback.ts`: `recordFeedback(reply, rating, suggestion?)` (lines 46-54) builds a `ReplyFeedback` (`{ id, at, rating, reply, suggestion? }`, interface lines 11-17), appends via `loadFeedback()` (27-35), persists via `save()` (37-43) → `JSON.stringify(list.slice(-CAP))` (CAP=100, MAXLEN=2000 chars/reply) to `secureLocal` key `"nilamind_feedback"` (line 19). This key **is** in `SENSITIVE_KEYS` (`secureLocal.ts:56`) — encrypted at rest.

**Built but never wired**: `attachSuggestion(id, suggestion)` (nilaFeedback.ts:57-65, for a "what would've helped" 👎 follow-up) and `pendingContributions()` (81-83) — neither called anywhere in `src/` outside their own definitions. No UI for typing a suggestion. `src/services/nilaContributions.ts` (consented-donation layer: `buildDonationPreview`, `confirmDonation`, `donatedContributions`, lines 69-107) is fully implemented (PII scrub, crisis-block, preview) but only `donationCount()`/`clearDonations()` are ever called, both from `NilaMemoryScreen.tsx:10`. **The "suggest a better reply → donate it" half of the flywheel is dead/unreachable code.**

**Who reads it**: only `src/components/NilaMemoryScreen.tsx` — `feedbackSummary()` (imported line 9, called line 49) rendered as plain-text aggregate (line 184-198): *"You've rated N replies — U 👍, D 👎[, and suggested S better replies]."* (`FeedbackSummary { total, up, down, suggestions }`, `nilaFeedback.ts:67`) — never raw reply text, never a per-message list. `donationCount()`/`clearDonations()` similarly surfaced as a count + withdraw button (lines 200-208).

**No dashboard/analytics reads it**: `nilamind_feedback` and `nilamind_donations` do **not** appear in `YourDataScreen.tsx`'s exportable `CATEGORIES` list (lines 30-42) — compare `nilamind_values_actions` at line 37, which is listed. Nothing correlates ratings with reply content/protocol/model version.

**Bottom line**: buttons fully functional, rating durably/encryptedly stored per-reply. Only consumer is a user-facing settings screen showing a running tally + wipe button. No developer-facing aggregation exists.

### Values migration — CORRECTION: the VLQ-cited tool assumption in the plan doc is backwards

The synthesis doc (`docs/superpowers/plans/2026-07-12-clinical-research-synthesis.md:87`) assumed `valuesWork.ts`/`ValuesWorkScreen.tsx` is the VLQ-cited tool. **The code shows the opposite: `values.ts`/`ValuesToActionScreen.tsx` is the VLQ-cited one.**

- `values.ts:2-22` header cites Wilson, Sandoz, Kitchens & Roberts (2010) VLQ, Hayes et al. (1999/2011, 2006), A-Tjak et al. (2015): "Structure follows the Valued Living Questionnaire (VLQ)."
- `ValuesToActionScreen.tsx:235-236` shows the citation to users: *"(Structure: Valued Living Questionnaire, Wilson et al., 2010; ACT, Hayes et al., 2011)"*.
- `values.ts` uses the VLQ's own dual-rating construct: `importance` × `consistency` (`DomainRating`, lines 44-47).
- `valuesWork.ts` has **no citation anywhere in the service file**. `ValuesWorkScreen.tsx:94-98` shows a citation, but it's for self-compassion (Ferrari et al. 2019; Neff 2003), not the values-domain structure.
- `valuesWork.ts` uses `importance` × `currentAlignment` — "alignment," not the VLQ's "consistency."

**Migration direction is therefore: `valuesWork.ts` (uncited) → `values.ts` (VLQ) schema, not the reverse.** Flag this correction to whoever originates the migration plan — a plan built on the reversed premise migrates data the wrong direction.

### Exact data shapes

**`values.ts` (VLQ-cited) — two stores:**
```ts
// key: "nilamind_values" — SINGLE current snapshot, overwritten on re-rate (values.ts:64,79-85)
interface ValuesSnapshot {
  date: string;        // YYYY-MM-DD
  timestamp: string;
  ratings: Record<string, DomainRating>;  // domainId -> rating
}
interface DomainRating { importance: number; consistency: number; }  // both 0-10

// key: "nilamind_values_actions" — UNBOUNDED array, append-only (values.ts:65,87-114)
interface CommittedAction {
  id: string;           // "va_" + Date.now() (ValuesToActionScreen.tsx:111)
  date: string;
  domainId: string;
  action: string;
  status: "open" | "done";
  doneDate?: string;
}
```
`VALUE_DOMAINS` (`values.ts:31-42`) is a fixed, hardcoded array of 10 domains — not user-extensible.

**`valuesWork.ts` (uncited) — one store, ratings+action fused into the domain record:**
```ts
// key: "nilamind_values_work" — array of domain records, each mutable in place (valuesWork.ts:3,40-52)
interface ValueDomain {
  id: string;
  name: string;
  description: string;
  importance: number;
  currentAlignment: number;    // NOT called "consistency"
  committedAction: string;     // ONE current action per domain
  completed: boolean;
  completedAt: string | null;
}
```
`VALUE_DOMAINS` (`valuesWork.ts:16-27`) seeds 10 defaults, but `ValuesWorkScreen.tsx:13-18` (`handleAddPreset`) lets users append arbitrary custom domains (freeform `name`, id `vw_${Date.now()}`) — open-ended, unlike `values.ts`.

**Security gap found in passing**: `"nilamind_values_work"` is **absent from `SENSITIVE_KEYS`** (`secureLocal.ts:30-70`) — compare `"nilamind_values"`/`"nilamind_values_actions"` at lines 40-41, which are listed. **`valuesWork.ts` data is stored in plaintext localStorage, not encrypted at rest.**

### Domain compatibility table

| values.ts (VLQ) id | label | valuesWork.ts id | label | match? |
|---|---|---|---|---|
| family | Family | family | Family | exact |
| close | Close relationships | relationships | Close relationships | 2 values.ts ids → 1 valuesWork id |
| friends | Friends & social | — | — | no counterpart; folds ambiguously into "relationships" |
| work | Work & purpose | work | Work & contribution | exact |
| growth | Learning & growth | growth | Learning & growth | exact |
| play | Play & recreation | play | Play & joy | exact |
| health | Health & body | health | Physical health | exact |
| meaning | Spirituality or meaning | spirituality | Spirituality & meaning | same concept, different id |
| community | Community & contribution | community | Community & belonging | exact |
| nature | Nature & environment | — | — | no counterpart at all |
| — | — | self_care | Self-compassion | no VLQ counterpart |
| — | — | autonomy | Independence & choice | no VLQ counterpart |
| — | — | vw_* (user-added) | arbitrary | no counterpart, open-ended |

6 exact matches (family, work, growth, play, health, community); 1 relabel-only (meaning↔spirituality); 1 lossy many-to-one (close+friends → relationships); 4 categories with no destination (nature; self_care; autonomy; user-custom).

Gap definitions also differ: `values.ts` `computeGaps()` (lines 133-147) clamps at zero (`Math.max(0, importance - consistency)`), surfaces only `importance >= 6`. `valuesWork.ts` `alignmentGap()` (lines 80-85) does not clamp (can be negative), filters only `importance > 0`. Genuinely different metrics, not just naming.

### Field-by-field migration mapping (`valuesWork.ts` → `values.ts`)

| valuesWork.ts field | → | values.ts target | Notes |
|---|---|---|---|
| `id` (fixed defaults) | → | `ratings[newId]` key | 6 direct, 1 relabel (spirituality→meaning), 1 ambiguous split (relationships→close and/or friends) |
| `importance` (0-10) | → | `DomainRating.importance` | Clean, same type/range |
| `currentAlignment` (0-10) | → | `DomainRating.consistency` | Same type/range, **unverified semantic equivalence** — "alignment" and "consistency" were never validated as the same construct; UI copy differs ("Current alignment" vs "Lived recently") — straight numeric copy is a judgment call |
| `committedAction` (string) | → | new `CommittedAction` row: `{ id: "va_"+Date.now(), date: today, domainId, action: committedAction, status: completed?"done":"open", doneDate: completedAt }` | Only one row per domain — `valuesWork.ts` never kept action history (`resetActions()` at line 72-74 already discards prior state), no migration-introduced loss beyond what's already lost |
| `completed`/`completedAt` | → | `CommittedAction.status`/`doneDate` | Direct, contingent on non-empty `committedAction` |
| (no date on domain rating) | → | `ValuesSnapshot.date`/`.timestamp` | Must fabricate "migrated on `<today>`" date — true original rating date is lost |
| `name`, `description` (custom domains) | → | *(no field)* | `values.ts` domain metadata is hardcoded per fixed id — no destination field exists |

**Unmappable data — must be dropped or manually reconciled:**
1. `self_care` (Self-compassion) — no VLQ destination.
2. `autonomy` (Independence & choice) — no VLQ destination.
3. Any user-added custom domain (`vw_*` ids) — `values.ts`'s `VALUE_DOMAINS` is hardcoded/non-extensible, no schema slot without a code change.
4. `close`/`friends` vs `relationships` split — direction-dependent ambiguity, no signal for how to split/merge.

**Silent-data-loss risks to flag:**
- `values.ts`'s `saveValues()` (lines 79-85) **overwrites the single `nilamind_values` snapshot wholesale** — if a user has independent VLQ ratings already (both tools are live today), a naive migration clobbers existing VLQ answers for any overlapping domain unless it explicitly merges keyed-by-domain-id.
- Migrated `CommittedAction` rows must carry the `"va_"` id prefix or they silently fail `isStepId()` in `valuesToAction.ts:32-34` and never round-trip through the unified "Do" list.
- `nilamind_values_work` is unencrypted plaintext — migration tooling should not assume at-rest protection.

### Navigation wiring — every reference to update

**`values_work`/`ValuesWorkScreen.tsx` (uncited) — fully wired into both hubs:**
- `App.tsx:41` — lazy import; `App.tsx:104` — title map `values_work: "Values work"`; `App.tsx:137` — route case.
- `src/components/toolsRows.ts:63` — Tools hub row, "Skills & practice" group.

**`values_to_action`/`ValuesToActionScreen.tsx` (VLQ-cited) — NOT in either hub row list, reachable only via:**
- `src/components/QuickActions.tsx:35` — home-surface quick-action chip.
- `ModeScreen.tsx:34` — plain (non-lazy) import; `ModeScreen.tsx:81` — `auxView` state type; `ModeScreen.tsx:477-479` — quick-action handler; `ModeScreen.tsx:1019-1032` — conditional render.
- `src/services/agent.ts:20,110` — chat-NLU intent router pattern `/\b(behaviou?ral activation|plan (an? )?activit|schedule activit|values( compass)?|toward steps?|values to action)\b/`.
- **Stale-comment flag**: `toolsRows.ts:11-13` claims `values_to_action` is "re-homed... now live under You → Resources," but `youRows.ts:41-46` (Resources group) lists only `thought_record`, `learn`, `insights` — `values_to_action` is **not actually present** there. The VLQ-cited tool is reachable only via home quick-actions grid + chat-detected intent, not from either hub.

Shared helper: `src/services/valuesToAction.ts` — a third, differently-named zero-storage compose/split helper flattening BA activities + `values.ts` committed actions into one "Do" list; round-trips items by id prefix `va_`/`ba_` via `isActivityId`/`isStepId` (lines 28-34). Any migration touching `CommittedAction` ids must preserve the `"va_"` prefix.

Export/data screen: `YourDataScreen.tsx:30-42` lists only `nilamind_values_actions` (line 37) as exportable/deletable. Neither `nilamind_values` nor `nilamind_values_work` appears — another surface a migration should update.

---

## 6. JITAI evaluation log

### What the cited papers actually say

**Nahum-Shani et al. (2018), *Annals of Behavioral Medicine* 52(6):446-462** defines JITAI components: decision point, tailoring variable, decision rule, proximal outcome, and **receptivity** — "the individual's transient ability/willingness to receive, process, and utilize just-in-time support... changing rapidly in the course of a day." Their FOCUS example: "support was not offered if the individual ignored the prompt (i.e., s/he is not receptive)." Rationale: unwanted support "will not be beneficial and may even have negative implications on engagement... and intervention fatigue." Decision-point spacing should track how often the tailoring variable is expected to meaningfully change.

**van Genugten et al. (2025), *Frontiers in Digital Health*** reviewed 5 real-world MH JITAIs: only 1 of 5 measured receptivity at all (self-report activity survey); the rest fired on vulnerability state alone. **No reviewed JITAI implements a cooldown or engagement-history-based suppression after non-response**, and **no numeric receptivity/re-engagement time window exists in the corpus** — timing was mostly "pragmatic," not theory-derived.

**Honesty check**: neither paper specifies a receptivity-cooldown duration. **Any specific hour figure below is an engineering default**, justified by internal consistency with NilaMind's existing patterns and Nahum-Shani's qualitative "match cooldown to how fast the tailoring variable can meaningfully change" principle — not literature-derived.

### What's in the codebase today

`src/services/jitaiEngine.ts` — `assessJitai()` is pure, no logging, no receptivity gate. Called from three sites, all evaluating live:
- `src/components/ModeScreen.tsx:167` — polled every 5 min via `setInterval` while a mode screen is open, sets in-app nudge UI state.
- `src/services/stateEngine.ts:123` — feeds the aggregated state-engine signal set.
- `src/services/nilaContext.ts:311` — injects `"JUST-IN-TIME NUDGE (...)"` into the LLM system-prompt context.

Since all three call the same pure `assessJitai()`, a persistent trigger (e.g. `mood_deterioration`) gets re-evaluated dozens of times/hour with no de-duplication — the concrete gap.

`src/services/notifications.ts` — `syncDailyReminders`/`syncEmaCheckins` gate on `withinQuietHours()` (`reminders.ts:30`) and the 24h crisis latch `isSafetySuppressed()` (`notificationSuppress.ts`), but neither is wired to `jitaiEngine.ts` — `assessJitai()`'s output never reaches `LocalNotifications`. **No dismissal/ignored-cooldown gate anywhere in this file.**

Reusable pattern already exists (different nudge system): `src/services/proactiveEngine.ts` implements a per-trigger-key timestamp cooldown — `isProactiveDismissed(key, cooldownMs)`, `dismissProactive(key)`, `secureLocal` key `nilamind_proactive_dismiss_<key>`. Cooldowns tuned per trigger: `COOLDOWN_MS = 24h` default, 3 days for `inactivity_nudge`, 7 days for `weekly_summary`. **`jitaiEngine.ts` should reuse this mechanism, not invent a new one.**

Capped-log primitive already exists: `appendToSecureArray<T>(key, item, cap)` in `src/services/secureLocal.ts:255` (atomic read-modify-write, `slice(-cap)` retention), already used by `exportAudit.ts` (`MAX_ENTRIES = 100`) and `nilaInflection.ts` (`LOG_CAP = 30`).

### Exact log-entry shape (new file `src/services/jitaiDecisionLog.ts`, mirroring `exportAudit.ts`)

```ts
const LOG_KEY = "nilamind_jitai_decisions";
const MAX_ENTRIES = 100; // matches exportAudit.ts precedent

export interface JitaiDecisionLogEntry {
  timestamp: number;                 // Date.now() at the decision point
  triggers: JitaiTrigger[];          // tailoring-variable state that fired
  severity: "gentle" | "noticeable" | "urgent";
  fired: boolean;                    // was an intervention actually offered, or gated/suppressed?
  suppressedBy?: "quiet_hours" | "crisis_latch" | "trigger_cooldown" | "none";
  suggestedTool: string | null;      // decision rule's chosen intervention option, never raw nudge text
  surface: "in_app_card" | "chat_context" | "notification";
  engaged: boolean | null;           // resolved lazily; null = window not yet elapsed
  engagedAt?: number;
}
```

**Deliberately excludes `nudgeText`/`lastUserText`** — matches the app's own privacy discipline (`notifications.ts`: "CONTENT-FREE... a lock-screen must not leak a mental-health conversation"); `triggers` + `suggestedTool` is enough to evaluate the decision rule without persisting sensitive content.

### Where to write entries

Keep `assessJitai()` pure (matches codebase's pure/side-effect split, cf. `computeProactiveMoment()` pure vs. `recordProactiveShown()`/`dismissProactive()` side-effecting in `proactiveEngine.ts`). Add a thin wrapper:

```ts
export function logJitaiDecision(decision: JitaiDecision, surface: JitaiDecisionLogEntry["surface"], suppressedBy?: ...): void
```

- **Log at**: `ModeScreen.tsx:167` (`surface: "in_app_card"`) and `nilaContext.ts:311` (`surface: "chat_context"`) — the two sites that actually deliver something to the user.
- **Skip logging at**: `stateEngine.ts:123` — internal signal aggregation with no independent delivery, avoids triple-counting.
- De-duplicate the 5-min polling loop in `ModeScreen.tsx` by writing at most once per unique `triggers` set per cooldown window — falls out naturally once the receptivity gate is in place (a gated re-evaluation writes `fired: false, suppressedBy: "trigger_cooldown"` instead of a fresh identical entry).

### Receptivity gate design

Reuse `proactiveEngine.ts`'s proven per-trigger cooldown pattern:
```ts
// keyed like proactiveEngine.ts: nilamind_jitai_last_shown_<trigger>
function isJitaiCooldownActive(trigger: JitaiTrigger, cooldownMs: number): boolean
function markJitaiShown(trigger: JitaiTrigger): void
```

- **Default cooldown = 24h** for `sleep_prodrome`, `mood_deterioration`, `high_distortion` — **engineering default**, justified by (a) internal consistency with `proactiveEngine.ts`'s existing 24h default and the app's "exactly ONE gentle nudge per day" principle, and (b) Nahum-Shani's qualitative rule (cooldown should track how fast the tailoring variable can meaningfully change: `mood_deterioration` is a 5-checkin rolling average, cannot move meaningfully within hours).
- **`inactivity` → 3-day cooldown**, matching `proactiveEngine.ts`'s existing `inactivity_nudge` value exactly — internal consistency, not new literature.
- **`elevation_risk` → no cooldown / exempt from gating.** Computed per-message from immediate text (fast-changing, per Nahum-Shani), safety-adjacent not discretionary — existing crisis-suppression precedent (`notificationSuppress.ts`) treats safety signals as override-only-forward, never throttled. Gating this like a wellness nudge risks suppressing a genuine repeated safety signal.
- **Engagement-history escalation** (ignored trigger → extend cooldown, e.g. 24h→48h, capped at ~4x base): **flagged honestly as zero direct precedent in either cited paper** — van Genugten explicitly found no reviewed JITAI does this. It is a reasonable extrapolation of Nahum-Shani's receptivity rationale, **not a validated technique**.

**Resolving `engaged`** — minimal viable version: new `lastActiveAt` timestamp updated on app foreground (existing `retentionMetrics.ts`'s `loadAppOpens()` is day-granularity, too coarse). At read-time, lazily mark any `engaged: null` entry older than the engagement window as `engaged = (lastActiveAt within [timestamp, timestamp + windowMs])`. **Engagement window = the trigger's cooldown value** (24h/72h) — deliberate choice so each entry finishes resolving exactly when the next decision point for that trigger opens. A more precise v2 (correlate `suggestedTool` against a per-tool-open timestamp) requires new instrumentation `usageAnalytics.ts` doesn't have today (`features` there is "ever adopted," not "last opened") — **flagged as a stretch goal, not part of the minimal design.**

---

## Feasibility flags for scope adjustment

1. **SRI (§1)** — the literal Phillips formula cannot be computed from current data (no per-epoch sleep/wake state exists anywhere in the app; Health Connect discards the needed timestamps at `healthConnect.ts:47-58`). Scope must include the timestamp-plumbing fix (stop discarding in `mapSleepSessions()`, fuse with Social Rhythm's bed/wake anchors) before the formula itself can be applied. This is a data-model change, not just a formula port.
2. **IU protocol (§2)** — the plan doc's citation basis is wrong (Dugas et al. 2022 is an unrelated 12-session protocol). The correct basis (Daniels, Hasan & Schweizer 2025) is a different, single-session-appropriate paper — the actionable protocol structure above reflects the *correct* citation, not the one in the original plan doc. No feasibility loss, but the `basis` string and any prior scoping built on the old citation needs updating.
3. **Values migration (§5)** — the plan doc's premise about which tool is VLQ-cited is inverted (`values.ts` is cited, not `valuesWork.ts`). Migration direction, and any prior scoping that assumed the reverse, needs correcting. Also newly found: `valuesWork.ts`'s store is unencrypted plaintext (missing from `SENSITIVE_KEYS`) — a security gap independent of the migration itself.
4. **JITAI receptivity gate (§6)** — no citation supports a specific cooldown duration or engagement-history escalation; both are engineering defaults / extrapolations, explicitly labeled as such per van Genugten et al.'s finding that no reviewed JITAI implements this at all. Ship with honest internal-only justification, not a citation claim.
