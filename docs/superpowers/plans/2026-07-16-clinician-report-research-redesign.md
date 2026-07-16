# Clinician Report Research-Grounded Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the clinician-facing report (`buildClinicianReport` / `generateClinicianPdfBlob`) so it surfaces the per-episode narrative data NilaMind already captures (instead of discarding it), and stops rendering two sections that contradict NilaMind's "not a diagnostic tool" claim.

**Architecture:** No new subsystems. Extend the existing `ClinicianEpisodeSummary` type to carry per-episode entries already sitting in `nilamind_episodes` (secure storage) but never surfaced. Delete two report sections (`Crisis Detection Performance`, `Temporal Risk Assessment`) and their PDF chart equivalents (risk gauge, risk factor bars) end-to-end: render code, PDF draw code, chart-spec builders, and the `ClinicianReportInput` fields that fed them. Leave the underlying computation engines (`temporalRiskAssessment.ts`, `crisisSafetyValidation.ts`) in place but orphaned — deleting them is a separate decision, not implied by "stop showing this to a doctor."

**Tech Stack:** TypeScript, Vitest, existing `ClinicianReportInput` / `buildClinicianReport` (src/services/clinicianReport.ts), `generateClinicianPdfBlob` (src/services/clinicianPdf.ts), `YourDataScreen.tsx` report assembly.

## Global Constraints

- TDD: write the failing test before the implementation for every step, per this repo's established practice.
- Every design decision in this plan traces to a specific research finding — cited inline in the task it justifies. Do not add report content, remove report content, or change report structure without a cited justification below.
- Do not delete `temporalRiskAssessment.ts`, `crisisSafetyValidation.ts`, or their test files — they become orphaned by this plan but that removal is out of scope (flag to user at the end, don't decide unilaterally).
- Do not touch `DiaryCardEntry`/DBT diary card summary, `Bipolar Phase Markers`, `Screening Trajectories`, `Sleep & Circadian`, or `Medication Adherence` sections — research supports these as-is (NIMH Life Chart / Consensus Sleep Diary validation findings), no research finding contradicts them.
- Full type check (`npx tsc --noEmit`) and full test suite must be green before any commit.
- This work happens in the isolated worktree at `.claude/worktrees/clinician-report-research-redesign` (branch `worktree-clinician-report-research-redesign`) — this repo has an active, documented parallel-dev hazard; do not touch files outside this plan's scope even if they appear modified by concurrent work.

## Research Basis (cited throughout tasks below)

1. **F1** — Retrospective recall of extreme mood shifts has 5–17% sensitivity vs. real-time report (Solhan, Trull, Jahng & Wood 2009, *Psychological Assessment*, [PMC2864015](https://pmc.ncbi.nlm.nih.gov/articles/PMC2864015/)).
2. **F2** — PHQ-9 answers are disproportionately shaped by the worst day and most recent state, not true average (Horwitz, Zhao & Sen 2023, *Psychological Assessment* 35(4):378-381, [PMC10052790](https://pmc.ncbi.nlm.nih.gov/articles/PMC10052790/)).
3. **F3** — Episode recall degrades over time (95%→85% at 12→24mo); SI recall skews false-positive (PReDICT trial follow-up, *J Psychiatric Research* 2019, PMID 30878146).
4. **F6** — EMA/real-time capture surfaces SI retrospective interview misses (71% vs 45% adolescents; 58% of adults' EMA-reported SI never disclosed in interview) (Kivelä et al. 2022 systematic review, [PMC9120419](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9120419/), citing Czyz 2018 and Gratch 2021).
5. **F9** — NIMH Life Chart self-ratings correlate strongly with clinician scales (r=-.718 IDS-C, r=.721 CGI-BP, N=108) (Born et al. 2014, *BMC Psychiatry* 14:130).
6. **F11** — Automation bias: clinicians "rely on AI-based tools despite the presence of contradictory or clinically nonsensical information" (Khera, Simon, Ross 2023, *JAMA* 330(23):2255-2257, DOI 10.1001/jama.2023.22557).
7. **F12** — "Automation complacency" from decision-support over-reliance causes "eroded vigilance, impoverished therapeutic relationships, and potentially poorer outcomes" (*AI and Ethics* 2025, DOI 10.1007/s43681-025-00825-2).
8. **F13** — Psychiatric ML models predicting relapse/symptom risk often lack external validation (documented 31% demographic accuracy gap in one case); AI outputs risk "disguising paternalism" if they "override patients' lived experiences" (Putica et al. 2025, *Psychological Medicine*, DOI 10.1017/S0033291725101311, IEACP framework).
9. **F14** — FDA's 2022 Final Guidance on Clinical Decision Support Software: software that "identifies a risk probability or risk score for a disease" does **not** qualify for the Non-Device CDS exemption (fails Criterion 3); exempt status requires disclosing "algorithm methods, datasets and validation, including...results from clinical studies" (Criterion 4) (FDA, Sept 2022 Final Guidance, confirmed via [Covington & Burling summary](https://www.cov.com/en/news-and-insights/insights/2022/10/5-key-takeaways-from-fdas-final-guidance-on-regulation-of-clinical-decision-support-software-fda-outlines-significant-changes-for-cds)).
10. **F15** — Threshold-line displays preferred for "normal vs. clinically concerning" individual symptom tracking; clinically-important-difference indicators improve clinician comprehension; consistent score directionality significantly improves interpretation accuracy (PCORI 2012 funded study).
11. **F16** — No single chart type dominates clinician interpretation accuracy; what matters is comparison anchors (own-previous-score, norm-population) and descriptive add-ons, not raw numbers in isolation (JPRO systematic review, 25 studies 2000-2020, DOI 10.1186/s41687-022-00424-3).

**Gap → Fix mapping:**
- Gap A (episode narrative silently discarded) → contradicts F1/F2/F3/F6/F9 (the entire value of NilaMind's data over patient memory is that it's captured close-in-time; discarding it throws away that advantage) → **Task 1**.
- Gap B (Temporal Risk Assessment: computed score + "Suicidal Ideation: X%" + recommendations) → contradicts F11/F12/F13, and fails FDA's own Non-Device CDS exemption test per F14 → **Task 2**.
- Gap C (Crisis Detection Performance: classifier's own sensitivity/specificity/F1) → app-QA telemetry, not patient information; no research supports showing model-evaluation metrics to a clinician as if they were clinical findings → **Task 3**.
- Gap E (report content scattered, no comparison anchors) → F15/F16 (pre-merge related data, keep consistent directionality, add comparison context) → addressed by Task 1's placement (entries directly under the existing aggregate stats, not a separate section).

---

## File Structure

- **Modify** `src/services/clinicianReport.ts` — add `ClinicianEpisodeEntry` type, extend `ClinicianEpisodeSummary`, extend Episode Log render block; remove `crisisMetrics`/`temporalRiskAssessment` fields and their two render blocks.
- **Modify** `src/services/clinicianReport.test.ts` — new tests for episode entries; remove nothing (no existing tests reference the two removed sections).
- **Modify** `src/components/YourDataScreen.tsx` — build `entries` array for the episode summary; stop threading `crisisMetrics`/`temporalRiskAssessment` into `ClinicianReportInput` (keep the underlying service calls only if used for anything besides the report — confirmed in Task 4 they are not, so the calls are removed entirely).
- **Modify** `src/services/clinicianCharts.ts` — remove `buildRiskGaugeSpec`, `RiskGaugeSpec`, `buildRiskFactorBars` (keep `FactorBar` — shared with `buildAdherenceBars`).
- **Modify** `src/services/clinicianCharts.test.ts` — remove the `buildRiskGaugeSpec`/`buildRiskFactorBars` describe blocks.
- **Modify** `src/services/clinicianPdf.ts` — remove `drawRiskGauge` function, the "Risk Assessment" and "Top Risk Factors" section draws, and now-unused imports.
- **Modify** `src/services/clinicianPdf.test.ts` — update the "rich-data case" fixture to drop `temporalRiskAssessment`.

---

### Task 1: Surface per-episode narrative in the Episode Log section

**Files:**
- Modify: `src/services/clinicianReport.ts:31-35` (interface), `src/services/clinicianReport.ts:173-184` (render block)
- Modify: `src/components/YourDataScreen.tsx:581-606` (episode assembly)
- Test: `src/services/clinicianReport.test.ts`

**Interfaces:**
- Produces: `ClinicianEpisodeEntry { date: string; time: string; dayOfWeek: string; timeOfDay: string; trigger: string | null; startIntensity: number; peakIntensity: number; endIntensity: number; durationMinutes: number; skillsHelpful: string[]; }`
- Produces: `ClinicianEpisodeSummary` gains `entries: ClinicianEpisodeEntry[]` (existing `count`/`byTimeOfDay`/`avgDurationMin` unchanged).

- [ ] **Step 1: Write the failing test for the new type and render behavior**

Add to `src/services/clinicianReport.test.ts`, replacing the existing `episodes` fixture in `baseInput` (line 34-38) with one that includes `entries`, and add a new test:

```typescript
  episodes: {
    count: 3,
    byTimeOfDay: "evening (2), afternoon (1)",
    avgDurationMin: 45,
    entries: [
      {
        date: "2026-07-12", time: "11:42 PM", dayOfWeek: "Sunday", timeOfDay: "night",
        trigger: "argument with roommate", startIntensity: 8, peakIntensity: 9, endIntensity: 3,
        durationMinutes: 42, skillsHelpful: ["TIPP", "calling a friend"],
      },
      {
        date: "2026-07-08", time: "6:10 PM", dayOfWeek: "Wednesday", timeOfDay: "evening",
        trigger: null, startIntensity: 7, peakIntensity: 7, endIntensity: 5,
        durationMinutes: 20, skillsHelpful: [],
      },
    ],
  },
```

Then add this test after the existing `"includes episode summary"` test (after line 107):

```typescript
  it("includes per-episode narrative entries with trigger, intensity arc, and skills that helped", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("2026-07-12 (Sunday) 11:42 PM");
    expect(report).toContain("argument with roommate");
    expect(report).toContain("8 → 9 → 3");
    expect(report).toContain("42 min");
    expect(report).toContain("TIPP, calling a friend");
  });

  it("labels a skipped trigger as not recorded rather than omitting the entry", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("2026-07-08 (Wednesday) 6:10 PM");
    expect(report).toContain("trigger not recorded");
  });

  it("caps rendered episode entries at 8 and notes how many more exist", () => {
    const manyEntries = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`, time: "9:00 PM", dayOfWeek: "Monday",
      timeOfDay: "evening", trigger: "test", startIntensity: 5, peakIntensity: 6, endIntensity: 4,
      durationMinutes: 10, skillsHelpful: [],
    }));
    const report = buildClinicianReport({
      ...baseInput,
      episodes: { count: 12, byTimeOfDay: "evening (12)", avgDurationMin: 10, entries: manyEntries },
    });
    const occurrences = report.split("min · helped:").length - 1 + report.split("min · trigger not recorded").length - 1;
    expect(report).toContain("showing most recent 8 of 12");
  });
```

Also update the existing `"handles zero episodes gracefully"` test (line 146-153) to include `entries: []` in its fixture:

```typescript
  it("handles zero episodes gracefully", () => {
    const input: ClinicianReportInput = {
      ...baseInput,
      episodes: { count: 0, byTimeOfDay: "", avgDurationMin: null, entries: [] },
    };
    const report = buildClinicianReport(input);
    expect(report).toContain("No episodes");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/clinicianReport.test.ts`
Expected: FAIL — `entries` does not exist on type `ClinicianEpisodeSummary`, and the new assertions fail (content not rendered).

- [ ] **Step 3: Add the `ClinicianEpisodeEntry` type and extend `ClinicianEpisodeSummary`**

In `src/services/clinicianReport.ts`, replace lines 31-35:

```typescript
export interface ClinicianEpisodeEntry {
  date: string;
  time: string;
  dayOfWeek: string;
  timeOfDay: string;
  trigger: string | null;
  startIntensity: number;
  peakIntensity: number;
  endIntensity: number;
  durationMinutes: number;
  skillsHelpful: string[];
}

export interface ClinicianEpisodeSummary {
  count: number;
  byTimeOfDay: string; // e.g. "evening (2), afternoon (1)"
  avgDurationMin: number | null;
  entries: ClinicianEpisodeEntry[];
}
```

- [ ] **Step 4: Extend the Episode Log render block**

Replace lines 173-184 (the `// Episodes` block) with:

```typescript
  // Episodes — F1/F2/F3/F6/F9: retrospective recall of episodes is unreliable (5-17%
  // sensitivity for extreme mood shifts); the value of this section is that entries were
  // captured close to the moment via the Episode Support debrief, not reconstructed later.
  // Do not collapse this back down to just count/avg/timing — that discards the one advantage
  // this data has over the patient trying to recall it in the room.
  if (input.episodes.count > 0) {
    lines.push("Episode Log");
    lines.push(`  Episodes logged: ${input.episodes.count}`);
    if (input.episodes.avgDurationMin != null) lines.push(`  Avg duration: ${input.episodes.avgDurationMin} min`);
    if (input.episodes.byTimeOfDay) lines.push(`  Timing: ${input.episodes.byTimeOfDay}`);
    const entries = input.episodes.entries;
    if (entries.length > 0) {
      lines.push("");
      const shown = entries.slice(0, 8);
      for (const e of shown) {
        const triggerText = e.trigger && e.trigger !== "Skipped" ? `trigger: "${e.trigger}"` : "trigger not recorded";
        const helpedText = e.skillsHelpful.length > 0 ? ` · helped: ${e.skillsHelpful.join(", ")}` : "";
        lines.push(`  ${e.date} (${e.dayOfWeek}) ${e.time} — ${triggerText} · intensity ${e.startIntensity} → ${e.peakIntensity} → ${e.endIntensity} over ${e.durationMinutes} min${helpedText}`);
      }
      if (entries.length > 8) {
        lines.push(`  (showing most recent 8 of ${entries.length})`);
      }
    }
    lines.push("");
  } else {
    lines.push("Episode Log");
    lines.push("  No episodes logged in this period.");
    lines.push("");
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/services/clinicianReport.test.ts`
Expected: PASS (all tests including the 3 new ones)

- [ ] **Step 6: Update the report-assembly call site in YourDataScreen.tsx**

In `src/components/YourDataScreen.tsx`, replace lines 602-606:

```typescript
      const sortedEpisodes = [...periodEpisodes].sort((a: any, b: any) => (a.date + a.time < b.date + b.time ? 1 : -1));
      const episodes = {
        count: periodEpisodes.length,
        avgDurationMin: ep?.avgDuration ?? null,
        byTimeOfDay: byTimeOfDayStr,
        entries: sortedEpisodes.map((e: any) => ({
          date: e.date,
          time: e.time,
          dayOfWeek: e.dayOfWeek,
          timeOfDay: e.timeOfDay,
          trigger: e.trigger,
          startIntensity: e.startIntensity,
          peakIntensity: e.peakIntensity,
          endIntensity: e.endIntensity,
          durationMinutes: e.durationMinutes,
          skillsHelpful: e.skillsHelpful ?? [],
        })),
      };
```

- [ ] **Step 7: Run full test suite to confirm nothing else broke**

Run: `npx vitest run src/components/YourDataScreen.test.tsx src/services/clinicianReport.test.ts src/services/clinicianPeriod.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/services/clinicianReport.ts src/services/clinicianReport.test.ts src/components/YourDataScreen.tsx
git commit -m "feat: surface per-episode trigger/intensity/skills narrative in clinician report

Previously the Episode Log section collapsed every logged episode down to a
bare count and time-of-day tally, discarding the trigger, intensity arc, and
skills-that-helped data already captured per-episode by the Episode Support
debrief flow. Research on retrospective recall (Solhan et al. 2009: 5-17%
sensitivity for extreme mood shifts; Horwitz et al. 2023 on PHQ-9 peak-end
bias) shows this close-in-time data is exactly what a patient can't reliably
reconstruct verbally in a visit — throwing it away threw away the app's one
advantage over the patient's own memory."
```

---

### Task 2: Remove the Temporal Risk Assessment section

**Files:**
- Modify: `src/services/clinicianReport.ts:38-100` (interface field), `src/services/clinicianReport.ts:313-362` (render block)
- Test: `src/services/clinicianReport.test.ts`

- [ ] **Step 1: Write the failing test asserting the section is gone even when data is supplied**

Add to `src/services/clinicianReport.test.ts`:

```typescript
  it("never renders a Temporal Risk Assessment section — F11/F12/F13/F14: computed risk scores shown to a clinician risk automation bias and fail FDA's Non-Device CDS exemption without disclosed validation", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Temporal Risk Assessment");
    expect(report).not.toContain("Risk Score");
    expect(report).not.toContain("Suicidal Ideation:");
  });
```

- [ ] **Step 2: Run test to verify it currently passes trivially but the field still exists**

Run: `npx vitest run src/services/clinicianReport.test.ts -t "Temporal Risk Assessment"`
Expected: PASS already (baseInput never set `temporalRiskAssessment`) — this test guards the deletion in the next steps; proceed to removal regardless since the field/dead code still exists.

- [ ] **Step 3: Remove the `temporalRiskAssessment` field from `ClinicianReportInput`**

In `src/services/clinicianReport.ts`, delete line 6 (`import type { RiskAssessment } from "./temporalRiskAssessment";`) and delete line 61 (`temporalRiskAssessment?: RiskAssessment; // Optional temporal risk assessment`).

- [ ] **Step 4: Remove the Temporal Risk Assessment render block**

In `src/services/clinicianReport.ts`, delete the entire block from the `// Temporal Risk Assessment (if available)` comment through its closing `}` (originally lines 313-362 — re-locate by searching for `"Temporal Risk Assessment"` after Task 1's edits shift line numbers).

- [ ] **Step 5: Run tests to verify they pass and nothing else references the removed field**

Run: `npx tsc --noEmit 2>&1 | grep clinicianReport` then `npx vitest run src/services/clinicianReport.test.ts`
Expected: `tsc` shows no errors in `clinicianReport.ts` itself (errors in `YourDataScreen.tsx`/`clinicianPdf.ts` are expected here — fixed in Tasks 3-4); vitest PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/clinicianReport.ts src/services/clinicianReport.test.ts
git commit -m "fix: remove Temporal Risk Assessment from clinician report

A computed risk score/level plus a 'Suicidal Ideation: X%' factor and
prescriptive recommendations, shown to a psychiatrist as if it were a
finding, contradicts NilaMind's own 'not a diagnostic tool' claim. Automation
bias is documented in clinical decision support generally (Khera, Simon,
Ross 2023, JAMA) and specifically for unvalidated psychiatric ML risk models
(Putica et al. 2025, Psychological Medicine). FDA's 2022 Final CDS Guidance
is the sharpest finding: software that identifies 'a risk probability or
risk score for a disease' fails the Non-Device CDS exemption's Criterion 3
unless it discloses algorithm methodology and validation-study results
(Criterion 4) — which this feature never did. The underlying engine
(temporalRiskAssessment.ts) is left in place, now orphaned; deleting it is a
separate decision, not implied by removing it from the clinician export."
```

---

### Task 3: Remove the Crisis Detection Performance section

**Files:**
- Modify: `src/services/clinicianReport.ts` (interface field + render block, exact lines shift after Task 2 — locate via search)
- Test: `src/services/clinicianReport.test.ts`

- [ ] **Step 1: Write the failing/guarding test**

Add to `src/services/clinicianReport.test.ts`:

```typescript
  it("never renders a Crisis Detection Performance section — this is model-QA telemetry (the classifier's own sensitivity/specificity), not patient information", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Crisis Detection Performance");
    expect(report).not.toContain("Sensitivity (Recall)");
  });
```

- [ ] **Step 2: Run test to confirm it currently passes (guard for the deletion below)**

Run: `npx vitest run src/services/clinicianReport.test.ts -t "Crisis Detection Performance"`
Expected: PASS (baseInput never sets `crisisMetrics`) — proceed to remove the dead code regardless.

- [ ] **Step 3: Remove the `crisisMetrics` field from `ClinicianReportInput`**

In `src/services/clinicianReport.ts`, delete the `import type { CrisisMetrics } from "./crisisSafetyValidation";` import line and the `crisisMetrics?: CrisisMetrics; // Optional crisis detection performance metrics` field line.

- [ ] **Step 4: Remove the Crisis Detection Performance render block**

Search for `"Crisis Detection Performance"` in `src/services/clinicianReport.ts` and delete the entire `if (input.crisisMetrics) { ... }` block.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/services/clinicianReport.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/clinicianReport.ts src/services/clinicianReport.test.ts
git commit -m "fix: remove Crisis Detection Performance from clinician report

Sensitivity/specificity/PPV/NPV/F1/calibration-error are measurements of how
well the on-device crisis classifier detects crisis language — that is
model-QA telemetry about the app, not clinical information about the
patient. It does not belong in a document meant to help a psychiatrist
understand what happened to their patient. The underlying
CrisisMetricsTracker (crisisSafetyValidation.ts) is left in place, now
orphaned."
```

---

### Task 4: Update YourDataScreen.tsx report assembly to stop computing/passing the removed fields

**Files:**
- Modify: `src/components/YourDataScreen.tsx` (around what was lines 636-641, and the `input` object assembly)

**Context:** `CrisisMetricsTracker` and `assessTemporalRisk` have exactly one call site in the whole codebase (this file) — confirmed via repo-wide grep during planning. Removing the calls here fully removes their only invocation; the underlying files (`crisisSafetyValidation.ts`, `temporalRiskAssessment.ts`) are untouched and become orphaned (flagged to user at the end of this plan, not deleted here).

- [ ] **Step 1: Write/extend a YourDataScreen test asserting the report input never includes the removed fields**

Check `src/components/YourDataScreen.test.tsx` for an existing test that builds a full report input (search for `"generates a clinician report"` or similar). If one exists, add assertions:

```typescript
    expect(reportInputPassedToBuildClinicianReport).not.toHaveProperty("crisisMetrics");
    expect(reportInputPassedToBuildClinicianReport).not.toHaveProperty("temporalRiskAssessment");
```

If no such test exists (report assembly is only exercised via the PDF-generation button handler and not directly unit tested), skip this step and rely on Task 4 Step 3's `tsc` pass plus Task 6's end-to-end sample generation — note this explicitly rather than inventing a test around code you haven't located.

- [ ] **Step 2: Remove the two service calls and their fields from the `input` object**

Delete these lines (originally 636-641):

```typescript
       // Get crisis metrics for the reporting period
       const crisisTracker = new CrisisMetricsTracker();
       const crisisMetrics = await crisisTracker.getMetrics();
       
       // Get temporal risk assessment
       const temporalRiskAssessment = await assessTemporalRisk();
```

Remove the now-unused imports of `CrisisMetricsTracker` and `assessTemporalRisk` from the top of the file. Remove `crisisMetrics,` and `temporalRiskAssessment,` from the `ClinicianReportInput` object literal being constructed (search for where `episodes,` and `phaseMarkers,` are listed — they should be adjacent).

- [ ] **Step 3: Run tsc to confirm no dangling references**

Run: `npx tsc --noEmit`
Expected: no errors referencing `crisisMetrics`, `temporalRiskAssessment`, `CrisisMetricsTracker`, or `assessTemporalRisk` in `YourDataScreen.tsx`. (Errors in `clinicianPdf.ts`/`clinicianCharts.ts` are expected here — fixed in Task 5.)

- [ ] **Step 4: Run the YourDataScreen test suite**

Run: `npx vitest run src/components/YourDataScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/YourDataScreen.tsx
git commit -m "fix: stop computing crisis-classifier metrics and temporal risk score for the clinician report

Follows the removal of both sections from clinicianReport.ts. These were
each called from exactly one place (here) purely to feed the now-removed
report sections."
```

---

### Task 5: Remove the risk gauge / risk factor bars from the PDF chart dashboard

**Files:**
- Modify: `src/services/clinicianCharts.ts:63-112` (types/builders)
- Modify: `src/services/clinicianCharts.test.ts` (remove corresponding describe blocks)
- Modify: `src/services/clinicianPdf.ts:186-243` (drawRiskGauge function), `src/services/clinicianPdf.ts:323-330` (call sites + section headings), imports
- Modify: `src/services/clinicianPdf.test.ts` (rich-data fixture)

**Context:** A gauge visual is, if anything, a *more* verdict-like presentation of the same computed risk score than the text version removed in Task 2 — same F11/F12/F13/F14 justification applies, more strongly (PCORI/F15 findings on visualization specifically warn that visual presentation affects interpretation more than raw numbers, so a risk gauge is not a safer way to show this than text was).

- [ ] **Step 1: Write the failing test for clinicianCharts.ts**

In `src/services/clinicianCharts.test.ts`, find and delete the `describe("buildRiskGaugeSpec", ...)` and `describe("buildRiskFactorBars", ...)` blocks (originally around lines 108-153) — there is no new behavior to test-first here, this is a pure deletion, so instead add one guard test confirming the exports are gone:

```typescript
import * as clinicianCharts from "./clinicianCharts";

describe("removed risk chart builders", () => {
  it("no longer exports buildRiskGaugeSpec or buildRiskFactorBars", () => {
    expect((clinicianCharts as any).buildRiskGaugeSpec).toBeUndefined();
    expect((clinicianCharts as any).buildRiskFactorBars).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/clinicianCharts.test.ts -t "removed risk chart builders"`
Expected: FAIL (the functions still exist)

- [ ] **Step 3: Delete `buildRiskGaugeSpec`, `RiskGaugeSpec`, and `buildRiskFactorBars` from clinicianCharts.ts**

In `src/services/clinicianCharts.ts`, delete the `RiskGaugeSpec` interface (lines 63-69), the `buildRiskGaugeSpec` function (lines 71-79), and the `buildRiskFactorBars` function (lines 104-112). Keep the `FactorBar` interface (line 81) — it's shared with `buildAdherenceBars` (line 113), which must remain unchanged. Remove the now-unused `import type { RiskAssessment, RiskFactors } from "./temporalRiskAssessment";` if nothing else in the file uses those types (check first with `grep -n "RiskAssessment\|RiskFactors" src/services/clinicianCharts.ts` after the deletion).

- [ ] **Step 4: Delete the corresponding old describe blocks from clinicianCharts.test.ts**

Delete `describe("buildRiskGaugeSpec", ...)` and `describe("buildRiskFactorBars", ...)` in full, including their `mockRisk` helper if it is not used by any remaining test (`grep -n "mockRisk" src/services/clinicianCharts.test.ts` to confirm before deleting the helper itself).

- [ ] **Step 5: Run clinicianCharts tests to verify pass**

Run: `npx vitest run src/services/clinicianCharts.test.ts`
Expected: PASS

- [ ] **Step 6: Remove `drawRiskGauge` and its call sites from clinicianPdf.ts**

In `src/services/clinicianPdf.ts`:
- Delete the `drawRiskGauge` function definition (originally lines 186-243, locate via search for `function drawRiskGauge`).
- Delete these two lines from `generateClinicianPdfBlob` (originally 326-330):
```typescript
    drawSectionHeading(canvas, "Risk Assessment");
    drawRiskGauge(canvas, buildRiskGaugeSpec(input.temporalRiskAssessment));

    drawSectionHeading(canvas, "Top Risk Factors");
    drawBarList(canvas, buildRiskFactorBars(input.temporalRiskAssessment?.factors), "No risk-factor data for this period.");
```
- Remove the now-unused `buildRiskGaugeSpec, buildRiskFactorBars,` from the import list at the top of the file (line ~25-26). Keep `drawBarList`, `buildAdherenceBars` — still used for Medication Adherence.
- Update the file-header comment (originally lines 306-311) that describes the PDF layout to drop the "risk gauge" and "top risk factors" mentions.

- [ ] **Step 7: Update clinicianPdf.test.ts's rich-data fixture**

In `src/services/clinicianPdf.test.ts`, find the "renders a PDF for the rich-data case" test (~line 48) and remove the `temporalRiskAssessment: { ... }` block (~line 64 onward) from its input fixture. Update the test's docstring/description if it explicitly mentions "risk assessment" in the title (e.g. rename to "renders a PDF for the rich-data case (full check-in history, medications)").

- [ ] **Step 8: Run full PDF/chart test suite**

Run: `npx vitest run src/services/clinicianPdf.test.ts src/services/clinicianCharts.test.ts`
Expected: PASS

- [ ] **Step 9: Run full type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 10: Commit**

```bash
git add src/services/clinicianCharts.ts src/services/clinicianCharts.test.ts src/services/clinicianPdf.ts src/services/clinicianPdf.test.ts
git commit -m "fix: remove risk gauge and risk-factor-bars from clinician PDF dashboard

A gauge visualization is a more prominent, more verdict-like presentation of
the same unvalidated composite risk score removed from the text report in
an earlier commit — same automation-bias and FDA Non-Device-CDS-exemption
concerns apply, more strongly for a chart than for text (PCORI-funded
research on PRO visualization specifically flags that visual presentation
shapes interpretation more than raw numbers do)."
```

---

### Task 6: Full verification — regenerate a sample report and confirm the redesign end-to-end

**Files:** none modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run 2>&1 | tail -30`
Expected: all test files pass, 0 failures.

- [ ] **Step 2: Run the full type check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Generate a fresh sample report with representative fixture data (mirroring the earlier throwaway inspection) to confirm the redesign visually**

Create a temporary (not committed) script or test that calls `buildClinicianReport` with a fixture including several `episodes.entries` (with and without a trigger), and confirm by reading the output that:
- The Episode Log section shows individual dated entries with trigger/intensity-arc/skills.
- No "Crisis Detection Performance" or "Temporal Risk Assessment" heading appears anywhere in the output.
- All previously-good sections (Screening Trajectories, Sleep & Circadian, Medication Adherence, Bipolar Phase Markers, DBT Diary Card Summary) are unchanged.

Delete the temporary script/file after inspection — do not commit it.

- [ ] **Step 4: Report status**

Summarize: tests passing count, tsc clean, sample report confirms both the addition (episode narrative) and the two removals, and explicitly flag to the user that `temporalRiskAssessment.ts` and `crisisSafetyValidation.ts`'s `CrisisMetricsTracker` are now orphaned (zero callers) — ask whether to delete them, keep them for a possible future private-only (non-clinician-facing) use, or leave as-is for now.
